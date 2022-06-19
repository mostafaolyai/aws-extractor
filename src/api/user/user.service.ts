import { Injectable } from '@nestjs/common';
import { GoogleAPIRequest } from './google-api-request';

@Injectable()
export class UserService {
    constructor(private readonly req: GoogleAPIRequest) {}

    async aws(): Promise<void> {
        const list = await this.req.getFilesList();

        for (const file of list?.Contents) {
            await this.req.getUrl2ByExtract(file.Key);
            //  await this.req.getUrl2ByExtract(list.Contents[200].Key);
        }
    }
}
