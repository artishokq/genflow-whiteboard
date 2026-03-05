type UserDtoModel = {
    id: string;
    email: string;
    isEmailVerified: boolean;
};

export default class UserDto {
    id: string;
    email: string;
    isEmailVerified: boolean;

    constructor(model: UserDtoModel) {
        this.id = model.id;
        this.email = model.email;
        this.isEmailVerified = model.isEmailVerified;
    }
}