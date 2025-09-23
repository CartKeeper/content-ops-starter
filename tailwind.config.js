const plugin = require('tailwindcss/plugin');
const themeStyle = require('./content/data/style.json');

module.exports = {
    darkMode: ['class'],
    content: ['./src/**/*.{js,ts,jsx,tsx}', './content/**/*', './.sourcebit-nextjs-cache.json'],
    safelist: [
        'text-neutral',
        'text-light',
        {
            pattern: /(m|p)(t|b|l|r)-(0|px|1|1.5|2|2.5|3|3.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)/
        },
    ],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: 'var(--space-4)',
                sm: 'var(--space-4)',
                lg: 'var(--space-5)',
                xl: 'var(--space-6)'
            }
        },
        fontFamily: {
            sans: ['var(--font-sans)']
        },
        extend: {
            boxShadow: {
                header: '0px 2px 8px rgba(27, 32, 50, .08)',
                card: 'var(--shadow-card)',
                glow: '0 0 var(--outline-blur) var(--outline-spread) hsl(var(--outline-color) / var(--outline-alpha))'
            },
            borderRadius: {
                card: 'var(--radius-card)',
                pill: 'var(--radius-pill)'
            },
            colors: {
                light: themeStyle.light,
                dark: themeStyle.dark,
                neutral: themeStyle.neutral,
                neutralAlt: themeStyle.neutralAlt,
                primary: themeStyle.primary,
                surface: {
                    DEFAULT: 'var(--surface-card)',
                    muted: 'var(--surface-muted)',
                    raised: 'var(--surface-raised)',
                    inverse: 'var(--surface-inverse)',
                    page: 'var(--surface-page)'
                },
                accent: {
                    DEFAULT: 'var(--crm-accent)',
                    contrast: 'var(--crm-accent-contrast)',
                    soft: 'var(--crm-accent-soft)',
                    hover: 'var(--crm-accent-hover)',
                    active: 'var(--crm-accent-active)',
                    bright: 'var(--crm-accent-bright)',
                    indigo: 'var(--accent-indigo)',
                    emerald: 'var(--accent-emerald)',
                    violet: 'var(--accent-violet)',
                    amber: 'var(--accent-amber)',
                    rose: 'var(--accent-rose)'
                },
                border: {
                    subtle: 'var(--border-subtle)',
                    strong: 'var(--border-strong)'
                },
                text: {
                    primary: 'var(--text-primary)',
                    subtle: 'var(--text-secondary)',
                    inverse: 'var(--text-inverse)'
                }
            },
            fontFamily: {
                serif: ['Roboto Slab', 'serif']
            },
            gridTemplateColumns: {
                16: 'repeat(16, minmax(0, 1fr))'
            },
            gridColumnStart: {
                span4: 'span 4'
            },
            gridColumnEnd: {
                neg3: '-3',
                span4: 'span 4'
            },
            maxWidth: {
                sectionBody: '846px'
            },
            padding: {
                '2/3': '66.666%',
                '3/4': '75%',
                '9/16': '56.25%'
            },
            spacing: {
                1: 'var(--space-1)',
                2: 'var(--space-2)',
                3: 'var(--space-3)',
                4: 'var(--space-4)',
                5: 'var(--space-5)',
                6: 'var(--space-6)',
                8: 'var(--space-8)',
                10: 'var(--space-10)'
            },
            screens: {
                xs: '480px'
            },
            width: {
                formField: 'calc(50% - 1rem)'
            }
        }
    },
    plugins: [
        plugin(function ({ addBase, addComponents, theme }) {
            addBase({
                body: {
                    fontFamily: theme(`fontFamily.${themeStyle.fontBody}`)
                },
                'h1,h2,h3,h4,h5,h6,blockquote': {
                    fontFamily: theme(`fontFamily.${themeStyle.fontHeadlines}`)
                },
                'h1,.h1': {
                    fontSize: theme(`fontSize.${themeStyle.h1.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h1.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h1.letterSpacing}`),
                    textDecoration: themeStyle.h1.decoration,
                    textTransform: themeStyle.h1.case
                },
                'h2,.h2': {
                    fontSize: theme(`fontSize.${themeStyle.h2.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h2.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h2.letterSpacing}`),
                    textDecoration: themeStyle.h2.decoration,
                    textTransform: themeStyle.h2.case
                },
                'h3,.h3': {
                    fontSize: theme(`fontSize.${themeStyle.h3.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h3.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h3.letterSpacing}`),
                    textDecoration: themeStyle.h3.decoration,
                    textTransform: themeStyle.h3.case
                },
                'h4,.h4': {
                    fontSize: theme(`fontSize.${themeStyle.h4.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h4.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h4.letterSpacing}`),
                    textDecoration: themeStyle.h4.decoration,
                    textTransform: themeStyle.h4.case
                },
                h5: {
                    fontSize: theme(`fontSize.${themeStyle.h5.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h5.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h5.letterSpacing}`),
                    textDecoration: themeStyle.h5.decoration,
                    textTransform: themeStyle.h5.case
                },
                h6: {
                    fontSize: theme(`fontSize.${themeStyle.h6.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h6.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h6.letterSpacing}`),
                    textDecoration: themeStyle.h6.decoration,
                    textTransform: themeStyle.h6.case
                }
            });
            addComponents({
                '.sb-component-button-primary': {
                    borderRadius: theme(`borderRadius.${themeStyle.buttonPrimary.borderRadius}`),
                    boxShadow: theme(`boxShadow.${themeStyle.buttonPrimary.shadow}`),
                    fontWeight: themeStyle.buttonPrimary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.buttonPrimary.letterSpacing}`),
                    padding: `${themeStyle.buttonPrimary.verticalPadding}px ${themeStyle.buttonPrimary.horizontalPadding}px`,
                    textTransform: themeStyle.buttonPrimary.case
                },
                '.sb-component-button-secondary': {
                    borderRadius: theme(`borderRadius.${themeStyle.buttonSecondary.borderRadius}`),
                    boxShadow: theme(`boxShadow.${themeStyle.buttonSecondary.shadow}`),
                    fontWeight: themeStyle.buttonSecondary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.buttonSecondary.letterSpacing}`),
                    padding: `${themeStyle.buttonSecondary.verticalPadding}px ${themeStyle.buttonSecondary.horizontalPadding}px`,
                    textTransform: themeStyle.buttonSecondary.case
                },
                '.sb-component-link-primary': {
                    fontWeight: themeStyle.linkPrimary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.linkPrimary.letterSpacing}`),
                    textTransform: themeStyle.linkPrimary.case
                },
                '.sb-component-link-secondary': {
                    fontWeight: themeStyle.linkSecondary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.linkSecondary.letterSpacing}`),
                    textTransform: themeStyle.linkSecondary.case
                }
            });
        })
    ]
};
