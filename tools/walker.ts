import { BigIntStats, Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

type OnFileHandler = (
  filePath: string,
  filename: string,
  fileExtension: string,
  content: string
) => Promise<void>;

type OnDirectoryHandler = (
  directoryPath: string,
  directoryName: string
) => Promise<void>;

export class FileTreeWalker {
  private onFileHandler: OnFileHandler | undefined;
  private onDirectoryHandler: OnDirectoryHandler | undefined;
  private fileEncoding: string = "utf8";
  private excludedFiles: string[] = [];
  private allowedFileTypes: string[] = [];

  onFile(onFileHandler: OnFileHandler): this {
    this.onFileHandler = onFileHandler;

    return this;
  }

  onDirectory(onDirectoryHandler: OnDirectoryHandler): this {
    this.onDirectoryHandler = onDirectoryHandler;

    return this;
  }

  setFileEncoding(fileEncoding: string): this {
    this.fileEncoding = fileEncoding;

    return this;
  }

  setExcludedFiles(excludedFiles: string[]): this {
    this.excludedFiles = excludedFiles;

    return this;
  }

  setAllowedFileTypes(allowedFileTypes: string[]): this {
    this.allowedFileTypes = allowedFileTypes;

    return this;
  }

  async walk(directoryPath: string): Promise<void> {
    const files: string[] = await readdir(directoryPath, {
      withFileTypes: false,
    });

    await Promise.all(
      files.map(async (filename: string) =>
        this.processFile(directoryPath, filename)
      )
    );
  }

  private async processFile(
    directoryPath: string,
    filename: string
  ): Promise<void> {
    const filePath: string = join(directoryPath, filename);
    const isExcludedFilename: boolean = this.excludedFiles.some(
      (excludedFileName) => filePath.includes(excludedFileName)
    );

    if (!isExcludedFilename) {
      await this.processAllowedFile(filePath, filename);
    }
  }

  private async processAllowedFile(
    filePath: string,
    filename: string
  ): Promise<void> {
    const fileExtension: string = extname(filename);
    const fileNameWithoutExtension: string = basename(filename, fileExtension);
    const stats = await this.readFileInfo(filePath);

    if (stats.isDirectory()) {
      await this.onDirectoryHandler?.(filePath, filename);
      await this.walk(filePath);
    } else if (
      stats.isFile() &&
      this.isAllowedFileType(fileExtension) &&
      this.onFileHandler
    ) {
      const data: string | Buffer = await this.readFile(filePath);

      await this.onFileHandler?.(
        filePath,
        fileNameWithoutExtension,
        fileExtension,
        data.toString()
      );
    }
  }

  private isAllowedFileType(fileType: string): boolean {
    if (this.allowedFileTypes.length > 0) {
      return this.allowedFileTypes.some(
        (allowedFileType) => fileType.replace(".", "") === allowedFileType
      );
    }

    return true;
  }

  private async readFile(filePath: string): Promise<string | Buffer> {
    return readFile(filePath, {
      encoding: this.fileEncoding as BufferEncoding,
    });
  }

  private readFileInfo(filePath: string): Promise<Stats | BigIntStats> {
    return stat(filePath);
  }
}
