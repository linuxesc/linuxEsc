import type {Metadata} from 'next';
import './globals.css';
import '@xterm/xterm/css/xterm.css';
export const metadata:Metadata={title:'LinuxQuest — Master Linux Through Gaming',description:'Learn Linux by doing. Explore 24 playable terminal missions, solve production incidents, and build real command-line confidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
