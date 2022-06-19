import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

export function initialize(app: NestExpressApplication): void {
    app.enableCors({
        origin: '*',
        methods: 'POST,GET,PATCH,DELETE,PUT',
        credentials: true,
    });

    app.use(
        '/' + './file/aws'.replace('./', ''),
        express.static(join(__dirname, '..', './file/aws'.replace('./', ''))),
    );
}
