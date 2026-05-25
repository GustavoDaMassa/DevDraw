import { IsString } from 'class-validator'

export class SaveContentDto {
  @IsString()
  content: string
}
