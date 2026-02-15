import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/CreateUserDto';

@Controller('auth')
export class AuthController {
    @Post('login')

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        
    }
}
