import { Module } from '@nestjs/common';
import { ConstantsService } from './constants.service';

@Module({
    exports: [ConstantsService],
    providers: [ConstantsService]

})
export class ConstantsModule { }
