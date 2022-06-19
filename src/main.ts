import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { initialize } from './init';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);


    initialize(app);
    await app.listen(3000);
}
bootstrap();
