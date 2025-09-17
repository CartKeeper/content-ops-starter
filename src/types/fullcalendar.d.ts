declare module '@fullcalendar/core' {
    export type DateSelectArg = any;
    export type EventClickArg = any;
    export type EventContentArg = any;
    export type EventInput = any;
    export type EventMountArg = any;
    const core: any;
    export default core;
}

declare module '@fullcalendar/daygrid' {
    const plugin: any;
    export default plugin;
}

declare module '@fullcalendar/interaction' {
    const plugin: any;
    export default plugin;
}

declare module '@fullcalendar/list' {
    const plugin: any;
    export default plugin;
}

declare module '@fullcalendar/timegrid' {
    const plugin: any;
    export default plugin;
}

declare module '@fullcalendar/react' {
    import * as React from 'react';
    class FullCalendar extends React.Component<any> {}
    export default FullCalendar;
}
