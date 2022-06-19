import { NotFoundException } from '@nestjs/common';
import { SaveGoogleFileRs } from './rq-rs/save-google-file';
import { CreateGoogleFolderRs } from './rq-rs/create-google-folder';

//googleapis
const { google } = require('googleapis');

const fs = require('fs');
const AWS = require('aws-sdk');

const axios = require('axios');

import { promisify } from 'util';
import * as stream from 'stream';
import { isError } from 'lodash';
import process from 'process';
export class GoogleAPIRequest {
    //client id
    CLIENT_ID = process.env.CLIENT_ID;

    //client secret
    CLIENT_SECRET = process.env.CLIENT_SECRET;
    //redirect URL
    REDIRECT_URI = process.env.REDIRECT_URI;

    //refresh token
    REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    oauth2Client;
    drive;
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(this.CLIENT_ID, this.CLIENT_SECRET, this.REDIRECT_URI);

        //setting our auth credentials
        this.oauth2Client.setCredentials({ refresh_token: this.REFRESH_TOKEN });

        //initialize google drive
        this.drive = google.drive({
            version: 'v3',
            auth: this.oauth2Client,
        });
    }

    async createFolder(folderName: string): Promise<CreateGoogleFolderRs> {
        return this.drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id, name',
        });
    }

    async searchFolder(folderName: string): Promise<CreateGoogleFolderRs | null> {
        return new Promise((resolve, reject) => {
            this.drive.files.list(
                {
                    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
                    fields: 'files(id, name)',
                },
                (
                    err,
                    res: {
                        data: {
                            kind: 'drive#fileList';
                            nextPageToken: string;
                            incompleteSearch: boolean;
                            files: CreateGoogleFolderRs[];
                        };
                    },
                ) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(res.data.files ? res.data.files[0] : null);
                },
            );
        });
    }

    async saveFile(
        fileName: string,
        filePath: string,
        fileMimeType: string,
        folderName?: string,
        folderId?: string,
    ): Promise<SaveGoogleFileRs> {
        //check file
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found!');
        }

        //check and create folder
        let folder;
        if (!folderId) {
            folder = await this.searchFolder(folderName).catch((error) => {
                // console.error(error);
                return null;
            });

            if (!folder) {
                folder = await this.createFolder(folderName);
                folder = folder ? folder.data : null;
            }
        }

        const createdFile = await this.drive.files.create({
            requestBody: {
                name: fileName,
                mimeType: fileMimeType,
                parents: folderId ? [folderId] : folder ? [folder.id] : null,
            },
            media: {
                mimeType: fileMimeType,
                body: fs.createReadStream(filePath),
            },
        });

        if (createdFile && createdFile.status === 200) {
            await this.drive.permissions.create({
                fileId: createdFile.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            //obtain the webview and webcontent links
            const result = await this.drive.files.get({
                fileId: createdFile.data.id,
                fields: 'webViewLink, webContentLink',
            });

            return new SaveGoogleFileRs(folder.id, createdFile.data.id, result.data.webViewLink, result.data.webContentLink);
        }

        return null;
    }

    //AWS
    createAWSinstance() {
        return new AWS.S3({
            credentials: {
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY,
            },
            region: 'us-east-1',
        });
    }

    async getFilesList() {
        const s3 = this.createAWSinstance();

        const params = {
            Bucket: process.env.BUCKET,
        };

        const data = s3.listObjects(params).promise();

        return data;
    }
    async getUrl(key) {
        const s3 = this.createAWSinstance();

        const params = {
            Bucket: process.env.BUCKET,
            Key: key,
        };

        const url = await s3.getSignedUrl('getObject', params);
        try {
            // const tt = 'http://www.sbeams.org/sample_data/Proteomics/yeast_orfs.new.20040422.gz';

            //DOWNLOAD
            const filename = key;
            const path = './file/aws';

            const downloadResult = await this.download2CO(url, path, filename);

            if (!isError(downloadResult)) {
                const result: SaveGoogleFileRs = await this.saveFile(filename, path + '/' + filename, 'application/zip', 'aws');

                //delete
                if (fs.existsSync(path + '/' + filename)) {
                    try {
                        fs.unlinkSync(path + '/' + filename);
                        console.log('DELETE FILE IN local: ');
                    } catch (e) {
                        console.log('DELETE FILE IN AWS: ', e);
                    }
                }
            }
        } catch (e) {
            console.log(e);
            return e;
        }

        return url;
    }
    async getUrl2ByExtract(key) {
        const s3 = this.createAWSinstance();

        const params = {
            Bucket: process.env.BUCKET,
            Key: key,
        };

        const url = await s3.getSignedUrl('getObject', params);
        // const url = 'http://www.sbeams.org/sample_data/Proteomics/yeast_orfs.new.20040422.gz';
        try {
            //DOWNLOAD
            const filename = key;
            const path = './file/aws';

            const downloadResult = await this.download2CO(url, path, filename);

            if (!isError(downloadResult)) {
                await this.extract(path + '/' + filename);
                console.log('extracted');
                const all = [];
                await new Promise((r, p) => {
                    fs.readdir(path, async (err, files) => {
                        // all=[...files]
                        console.log(files);
                        files.forEach((file) => {
                            all.push(file);
                        });
                        r('ok');
                    });
                });
                console.log('files: ', all);
                for (const p of all) {
                    const result: SaveGoogleFileRs = await this.saveFile(p, path + '/' + p, 'application/file', 'aws2');

                    console.log('res', 'uploaded');
                    //delete
                    if (fs.existsSync(path + '/' + p)) {
                        try {
                            fs.unlinkSync(path + '/' + p);
                        } catch (e) {
                            console.log('DELETE FILE IN AWS: ', e);
                        }
                    }
                    console.log('res', 'deleted');
                }
            }
        } catch (e) {
            console.log(e);
            return e;
        }

        return url;
    }

    async download2CO(url: string, path: string, filename: string): Promise<any> {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }

        const finished = promisify(stream.finished);
        return axios({
            method: 'get',
            url: url,
            responseType: 'stream',
        })
            .then(async (response) => {
                if (response && response.status === 200) {
                    const writer = fs.createWriteStream(`${path}/${filename}`);
                    response.data.pipe(writer);
                    return finished(writer); //this is a Promise
                }
            })
            .catch((e) => {
                return e;
            });
    }

    async extract(source: string): Promise<any> {
        const gunzip = require('gunzip-file');
        return new Promise((resolve, reject) => {
            gunzip(source, source.replace('.gz', ''), () => {
                console.log('extracted 0');

                //delete
                if (fs.existsSync(source)) {
                    try {
                        fs.unlinkSync(source);
                    } catch (e) {
                        console.log('DELETE FILE IN AWS: ', e);
                    }
                }
                resolve('done');
            });
        });
    }
}
