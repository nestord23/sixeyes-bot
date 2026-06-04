import cp from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { logger } from '../utils/logger';

function findYtDlpPath(): string {
  const packageDir = path.dirname(require.resolve('youtube-dl-exec/package.json'));
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const binaryPath = path.join(packageDir, 'bin', binaryName);
  if (fs.existsSync(binaryPath)) return binaryPath;
  throw new Error(`yt-dlp binary not found at ${binaryPath}. Try reinstalling youtube-dl-exec.`);
}

const ytDlpPath = findYtDlpPath();

export async function getAudioUrl(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(ytDlpPath, [
      '-f', 'bestaudio',
      '--get-url',
      '--no-warnings',
      videoUrl,
    ]);

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    child.on('close', (code: number | null) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${errorOutput.trim() || 'No output'}`));
      }
    });

    child.on('error', reject);
  });
}
