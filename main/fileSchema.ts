import { pre, prop, Typegoose } from "typegoose";

@pre<FileSchema>("save", function(next: CallableFunction) {
  const now = new Date();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
})
export class FileSchema extends Typegoose {
  @prop() public mimeType?: string;
  @prop() public name?: string;
  @prop() private createdAt?: Date;
}
