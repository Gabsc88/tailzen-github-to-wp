interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  content?: string;
}

interface GitHubRepo {
  name: string;
  description?: string;
  html_url: string;
}

export class GitHubService {
  private static async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Failed to fetch after retries');
  }

  static async getRepoInfo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  static async getRepoContents(owner: string, repo: string, path = ''): Promise<GitHubFile[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  static async getFileContent(downloadUrl: string): Promise<string> {
    const response = await this.fetchWithRetry(downloadUrl);
    return response.text();
  }

  static async getAllFiles(owner: string, repo: string): Promise<GitHubFile[]> {
    const allFiles: GitHubFile[] = [];
    
    const processDirectory = async (path = '') => {
      const contents = await this.getRepoContents(owner, repo, path);
      
      for (const item of contents) {
        if (item.type === 'file') {
          allFiles.push(item);
        } else if (item.type === 'dir' && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await processDirectory(item.path);
        }
      }
    };

    await processDirectory();
    return allFiles;
  }
}