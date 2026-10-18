export const baseUrl = process.env.BROWSER_BASE_URL || 'http://127.0.0.1:3101';
export const browserOptions = {
  executablePath: process.env.BROWSER_EXECUTABLE_PATH,
  channel: process.env.BROWSER_EXECUTABLE_PATH
    ? undefined
    : process.platform === 'darwin' ? 'chrome' : undefined,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
};
