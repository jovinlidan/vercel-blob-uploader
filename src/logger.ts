export class Logger {
  static info(...messages: any[]) {
    console.info("\x1b[37m", ...messages, "\x1b[0m");
  }

  static success(...messages: any[]) {
    console.info("⚡\x1b[32m", ...messages, "\x1b[0m");
  }

  static highlight(...messages: any[]) {
    console.log("\x1b[36m", ...messages, "\x1b[0m");
  }

  static warn(...messages: any[]) {
    console.error("⚠️  \x1b[33m", ...messages, "\x1b[0m");
  }

  static error(...messages: any[]) {
    console.error("\x1b[33m", ...messages, "\x1b[0m");
  }
}
