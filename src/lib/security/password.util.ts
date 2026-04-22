export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    PASSWORD_UPPERCASE_REGEX.test(value) &&
    PASSWORD_LOWERCASE_REGEX.test(value) &&
    PASSWORD_NUMBER_REGEX.test(value)
  );
}
