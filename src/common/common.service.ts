import { Injectable } from '@nestjs/common';
import { AddSwitchReplaceActionDto } from 'src/board/Dto/AddSwitchReplaceActionDto';

@Injectable()
export class CommonService {
    generateOtp(): string {
        const otpLength = 6;
        let otp = '';
        for (let i = 0; i < otpLength; i++) {
            otp += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
        }
        return otp;
    }

    validateFlags(dto: AddSwitchReplaceActionDto): boolean {
        const flags = [dto.isVanish, dto.isReplace, dto.isInfoOverlay];
        const trueFlags = flags.filter(flag => flag === true);
        if(trueFlags.length==0){
            return false;
        }
        return trueFlags.length <= 1 ; // Only one or none should be true
      }

      async getExtensionFromAllMimeType(
        mimeType: string,
      ): Promise<{ extension: string; type: string }> {
        // Fallback MIME type to extension mappings
        const mimeTypes = new Map([
          // Video Types
          ['video/mp4', { extension: 'mp4', type: 'video' }],
          ['video/mpeg', { extension: 'mpeg', type: 'video' }],
          // ['video/quicktime', { extension: 'mov', type: 'video' }], @kiran darode
          ['video/mov', { extension: 'mov', type: 'video' }],
          ['video/webm', { extension: 'webm', type: 'video' }],
          ['video/x-matroska', { extension: 'mkv', type: 'video' }],
          ['video/x-ms-wmv', { extension: 'wmv', type: 'video' }],
    
          // Image Types
          ['image/jpeg', { extension: 'jpeg', type: 'image' }],
          ['image/jpg', { extension: 'jpg', type: 'image' }],
          ['image/png', { extension: 'png', type: 'image' }],
        ]);
    
        // Check if MIME type exists in the map, else return default values
        const result = mimeTypes.get(mimeType);
        return result || { extension: 'unknown', type: 'unknown' };
      }

      async getExtensionFromMimeType(mimeType: string): Promise<string> {
        // Fallback MIME type to extension mappings
        // const mimeTypes = new Map([
        //   // Video Types
        //   ['video/mp4', 'mp4'],
        //   ['video/mpeg', 'mpeg'],
        //   ['video/quicktime', 'mov'],
        //   ['video/webm', 'webm'],
        //   ['video/x-matroska', 'mkv'],
        //   ['video/x-ms-wmv', 'wmv'],

    
        //   // Image Types
        //   ['image/jpeg', "jpeg"],
        //   ['image/jpg', "jpg"],
        //   ['image/png', "png"],

        // ]);


        const mimeTypes = new Map([
          // Image Types
          ['image/jpeg', 'jpeg'],
          ['image/jpg', 'jpg'],
          ['image/png', 'png'],
          ['image/gif', 'gif'],
          ['image/webp', 'webp'],
          ['image/bmp', 'bmp'],
          ['image/svg+xml', 'svg'],
          ['image/heic', 'heic'],
          ['image/heif', 'heif'],
      
          // Video Types
          ['video/mp4', 'mp4'],
          ['video/ogg', 'ogg'],
          ['video/mpeg', 'mpeg'],
          ['video/quicktime', 'mov'],
          ['video/webm', 'webm'],
          ['video/x-matroska', 'mkv'],
          ['video/x-msvideo', 'avi'],
          ['video/x-ms-wmv', 'wmv'],
          ['video/x-flv', 'flv'],
          ['video/3gpp', '3gp'],
          ['video/3gpp2', '3g2'],
          ['video/MP2T', 'ts'],
          ['video/vnd.rn-realvideo', 'rv'],
          ['video/x-ms-asf', 'asf'],
          ['video/x-m4v', 'm4v']
      ]);
      
        // Check if MIME type exists in the map, else return 'Unknown'
        return mimeTypes.get(mimeType) || 'unknown';
      }

      async extractFilename(url: string): Promise<string> {
        // Use the URL object to parse the URL
        const urlObj = new URL(url);
    
        // Extract the pathname and get the last part as the filename
        const filename = urlObj.pathname.split('/').pop();
    
        return filename;
      }
    
}
