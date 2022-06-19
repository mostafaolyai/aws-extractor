import { Module } from "@nestjs/common";
import { UserModule } from "./api/user/user.module";


@Module({
    imports: [
        
        UserModule,
    ],
    providers: [
    ],
})
export class AppModule {}
