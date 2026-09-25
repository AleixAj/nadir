// Cleans a name typed by a user: no links, no HTML characters, no extra spaces
// and 60 characters at most. Stops the name field being used to slip spam links
// into the app or into anything we show to other people.
export function cleanName(name: string): string {
  const clean = name
    .replace(/(https?:\/\/|www\.)\S*/gi, "") // links
    .replace(/\S+\.(com|net|org|es|io|ru|xyz|info|top|link|click)\b\S*/gi, "") // bare domains
    .replace(/[<>"`{}]/g, "") // characters used in HTML or scripts
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return clean || "Usuario";
}
