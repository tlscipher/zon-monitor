import crypto from 'crypto';

const ENC_KEY = "DCFFA263CC98506B65D3DDD257EB9725";
const IV = "0534C759B6669157";

export const encrypt = (value:string): string => {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, IV);
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}