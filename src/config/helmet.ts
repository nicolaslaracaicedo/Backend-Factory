import helmet from 'helmet';

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'"],
      imgSrc:                  ["'self'", 'data:'],
      connectSrc:              ["'self'"],
      fontSrc:                 ["'self'"],
      objectSrc:               ["'none'"],
      frameSrc:                ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: {
    maxAge:            31536000,
    includeSubDomains: true,
    preload:           true,
  },
  noSniff:                   true,
  frameguard:                { action: 'deny' },
  hidePoweredBy:             true,
  referrerPolicy:            { policy: 'no-referrer' },
  ieNoOpen:                  true,
  dnsPrefetchControl:        { allow: false },
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});
