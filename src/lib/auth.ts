import SpotifyProvider from "next-auth/providers/spotify";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      // Spotify doesn't always rotate the refresh token — keep the old one if absent.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: `https://accounts.spotify.com/authorize?scope=${SPOTIFY_SCOPES}&show_dialog=true`,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist the tokens Spotify just issued.
      if (account) {
        return {
          ...token,
          // Spotify's OAuth response always includes access_token/refresh_token/expires_at.
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          accessTokenExpires: account.expires_at! * 1000,
          // providerAccountId is next-auth's guaranteed field for the provider's user
          // id — more robust than relying on the raw Spotify profile's shape.
          spotifyId: account.providerAccountId,
        };
      }

      // Still fresh (1 min safety margin) — reuse as-is.
      if (Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      // Expired — refresh silently, server-side, before it's used again.
      return refreshSpotifyAccessToken(token);
    },
    async session({ session, token }) {
      // Security boundary: only these fields are ever serialized to the browser via
      // useSession() / GET /api/auth/session. accessToken/refreshToken live only on
      // `token` and are deliberately never copied here — route handlers read them
      // server-side via getToken() from next-auth/jwt instead.
      session.user.id = token.spotifyId;
      session.error = token.error;
      return session;
    },
  },
};
