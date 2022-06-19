import { Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';


@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}


    @Post('aws')
    async aws(): Promise<void> {
        return await this.userService.aws();
    }

}
