
import { dedupe } from './Dedupe';

const scripts: { [key: string]: Promise<any> } = {};

export function loadScript(src: string): Promise<any> {
    if (scripts[src]) {
        return Promise.resolve();
    }
    return dedupe(src, () => {
        return scripts[src] = new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = src;
            script.addEventListener('load', () => {
                resolve();
            });
            document.body.appendChild(script);
        });
    });
}
