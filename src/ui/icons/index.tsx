import type { ComponentProps, ComponentType } from 'react';
import * as TablerIcons from '@tabler/icons-react';

const fallbackIcon = TablerIcons.IconCircle as ComponentType<TablerIconProps>;

const TABLER_ICON_LIBRARY = TablerIcons as unknown as Record<string, ComponentType<TablerIconProps>>;

type TablerIconProps = ComponentProps<typeof TablerIcons.IconCircle>;

export const ICONS = {
    aperture: 'IconAperture',
    arrowDown: 'IconArrowDown',
    arrowDownRight: 'IconArrowDownRight',
    arrowUpRight: 'IconArrowUpRight',
    bell: 'IconBell',
    calendar: 'IconCalendar',
    check: 'IconCheck',
    chevronDown: 'IconChevronDown',
    chevronRight: 'IconChevronRight',
    chip: 'IconStack',
    clients: 'IconAddressBook',
    dollar: 'IconCurrencyDollar',
    dots: 'IconDots',
    download: 'IconDownload',
    edit: 'IconEdit',
    home: 'IconLayoutDashboard',
    integrations: 'IconPlugConnected',
    invoices: 'IconReceipt2',
    list: 'IconListDetails',
    logout: 'IconLogout2',
    menu: 'IconMenu2',
    notifications: 'IconBell',
    palette: 'IconPalette',
    photo: 'IconPhoto',
    plus: 'IconPlus',
    projects: 'IconFolders',
    search: 'IconSearch',
    settings: 'IconSettings',
    sparkles: 'IconSparkles',
    stats: 'IconChartBar',
    sun: 'IconSun',
    moon: 'IconMoon',
    minus: 'IconMinus',
    tasks: 'IconChecklist',
    upload: 'IconUpload',
    user: 'IconUser',
    users: 'IconUsers',
    x: 'IconX'
} as const;

export type IconKey = keyof typeof ICONS;

export function Icon({ name, className, stroke = 1.5, size, ...rest }: {
    name: IconKey;
    className?: string;
    stroke?: number;
    size?: number | string;
} & Omit<TablerIconProps, 'className' | 'stroke' | 'size'>) {
    const tablerName = ICONS[name];
    const Component = TABLER_ICON_LIBRARY[tablerName] || fallbackIcon;

    return <Component className={className} stroke={stroke} size={size} aria-hidden {...rest} />;
}

export function resolveIcon(name: IconKey): ComponentType<TablerIconProps> {
    const tablerName = ICONS[name];
    return TABLER_ICON_LIBRARY[tablerName] || fallbackIcon;
}
