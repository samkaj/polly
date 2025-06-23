use std::{sync::Arc, time::Duration};

use chromiumoxide::{Browser, BrowserConfig, cdp::js_protocol::runtime::EventConsoleApiCalled};
use clap::Parser;
use futures::{StreamExt, lock::Mutex};
use log::{error, info};
use scripts::property_access_proxy;

mod scripts;

#[derive(Parser)]
#[command(about)]
/// CLI for detecting reads and writes on the prototype object in JavaScript
struct Cli {
    /// Property to look for, e.g., `innerHTML`
    #[arg(short = 'p', long = "property")]
    property: String,

    /// Timeout period before visiting the next URL (or exiting)
    #[arg(short = 't', long = "timeout", default_value_t = 5)]
    timeout: u64,

    /// URL(s) to check
    urls: Vec<String>,
}

#[tokio::main]
async fn main() {
    colog::init();
    let cli = Cli::parse();

    let urls = cli.urls;
    let prop = cli.property;
    let timeout = cli.timeout;
    for url in urls {
        info!("{}", url);
        if let Err(err) = visit(url, prop.clone(), timeout).await {
            error!("{}", err);
        }
    }
}

async fn visit(
    url: String,
    property: String,
    timeout_duration: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Setting up browser");
    let (mut browser, mut handler) = Browser::launch(BrowserConfig::builder().build()?).await?;

    let handle =
        tokio::task::spawn(async move { while let Some(_event) = handler.next().await {} });

    info!("Adding property access proxies");
    let page = browser.new_page("about:blank").await?;
    page.evaluate_on_new_document(property_access_proxy(property))
        .await?;

    let messages: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(vec![]));
    let task_messages = Arc::clone(&messages);

    let mut runtime_events = page.event_listener::<EventConsoleApiCalled>().await?;
    info!("Listening for console messages");
    let events_handle = tokio::spawn(async move {
        while let Some(event) = runtime_events.next().await {
            let event = (*event).clone();
            let message = event
                .args
                .iter()
                .filter_map(|arg| arg.clone().value.map(|v| v.to_string()))
                .collect::<Vec<String>>()
                .join(" ");
            let mut msgs = task_messages.lock().await;
            msgs.push(message);
        }
    });

    info!("Visiting {}", url);
    page.goto(url).await?;
    tokio::time::sleep(Duration::from_secs(timeout_duration)).await;

    let final_messages = messages.lock().await.clone();
    let messages: Vec<&String> = final_messages
        .iter()
        .filter(|msg| msg.starts_with("\"[SET]") || msg.starts_with("\"[GET]"))
        .collect();

    for r in messages {
        info!("{}", r);
    }

    browser.close().await?;
    handle.await?;
    events_handle.await?;
    Ok(())
}
