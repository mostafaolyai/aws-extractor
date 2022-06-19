export class SaveGoogleFileRs {
    folderId: string;
    fileId: string;
    viewLink: string;
    downloadLink: string;

    constructor(folderId: string, fileId: string, viewLink: string, downloadLink: string) {
        this.folderId = folderId;
        this.fileId = fileId;
        this.viewLink = viewLink;
        this.downloadLink = downloadLink;
    }
}
