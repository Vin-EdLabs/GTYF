import { ViteReactSSG } from 'vite-react-ssg';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/figtree/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles/index.css';
import { routes } from './routes';

// Every public route is prerendered to static HTML at build time, then hydrated.
export const createRoot = ViteReactSSG({ routes });
