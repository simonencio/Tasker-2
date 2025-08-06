declare module "toaster-js" {
  export class Toast {
    static TYPE_DONE: string;
    static TYPE_ERROR: string;
    static TIME_SHORT: number;
    static TIME_NORMAL: number;
    static TIME_LONG: number;
    constructor(message: string, type?: string, duration?: number);
  }
}
