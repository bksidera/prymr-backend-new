import { Module } from '@nestjs/common';
import { JwtAuthGuard, LocalAuthGuard } from './guards.service';

@Module({
    providers: [JwtAuthGuard, LocalAuthGuard],
    exports: [JwtAuthGuard, LocalAuthGuard],
})
export class GuardsModule {
}
