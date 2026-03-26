import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(ht|fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
