import classNames from 'classnames';

export function cn(...inputs: Parameters<typeof classNames>): string {
    return classNames(...inputs);
}

export default cn;
