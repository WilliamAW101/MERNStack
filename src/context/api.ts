// import queryString from "query-string";
// import slugify from "slugify";

// export const sendRequest = async <T>(props: IRequest) => {
//     // <T>: type
//     let {
//         url,
//         method,
//         body,
//         queryParams = {},
//         useCredentials = false,
//         headers = {},
//         nextOption = {},
//     } = props;

//     const options: any = {
//         method: method,
//         // by default setting the content-type to be json type
//         headers: new Headers({ "content-type": "application/json", ...headers }),
//         body: body ? JSON.stringify(body) : null,
//         ...nextOption,
//     };

//     if (useCredentials) options.credentials = "include";

//     if (queryParams) {
//         url = `${url}?${queryString.stringify(queryParams)}`;
//     }

//     return fetch(url, options).then((res) => {
//         if (res.ok) {
//             return res.json() as T;
//         } else {
//             return res.json().then(function (json) {
//                 // to be able to access error status when you catch the error
//                 return {
//                     statusCode: res.status,
//                     message: json?.message ?? "",
//                     error: json?.error ?? "",
//                 } as T;
//             });
//         }
//     });
// };

// export const sendRequestFile = async <T>(props: IRequest) => {
//     // <T>: type
//     let {
//         url,
//         method,
//         body,
//         queryParams = {},
//         useCredentials = false,
//         headers = {},
//         nextOption = {},
//     } = props;

//     const options: any = {
//         method: method,
//         // by default setting the content-type to be json type
//         headers: new Headers({ ...headers }),
//         body: body ? body : null,
//         ...nextOption,
//     };
//     if (useCredentials) options.credentials = "include";

//     if (queryParams) {
//         url = `${url}
//     ${queryString.stringify(queryParams)}`;
//     }

//     return fetch(url, options).then((res) => {
//         if (res.ok) {
//             return res.json() as T;
//         } else {
//             return res.json().then(function (json) {
//                 // to be able to access error status when you catch the error
//                 return {
//                     statusCode: res.status,
//                     message: json?.message ?? "",
//                     error: json?.error ?? "",
//                 } as T;
//             });
//         }
//     });
// };

// // export const fetchDefaultImages = (type: string) => {
// //     if (type === "GOOGLE") return "/user/default-google.png";
// //     return "/user/default-user.png";
// // };

// export const convertSlugUrl = (str: string) => {
//     if (!str) return;
//     str = slugify(str, {
//         lower: true,
//         locale: "vi",
//     });
//     return str;
// };

// // A Naive Store
// const globalStore = () => {
//     const memory = new Map();

//     return {
//         get pathname() {
//             return memory.get("pathname");
//         },
//         set pathname(path: string) {
//             memory.set("pathname", path);
//         },
//     };
// };

// export const store = globalStore();

// // Route handling

// function removeTrailingSlash(path: string) {
//     return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
// }

// function getRouteAsPath(
//     pathname: string,
//     query: Record<string, string | number | string[] | number[]>,
//     hash?: string | null | undefined
// ) {
//     const remainingQuery = { ...query };

//     // Replace slugs, and remove them from the `query`
//     let asPath = pathname.replace(/\[{1,2}(.+?)]{1,2}/g, ($0, slug: string) => {
//         if (slug.startsWith("...")) slug = slug.replace("...", "");

//         const value = remainingQuery[slug]!;
//         delete remainingQuery[slug];
//         if (Array.isArray(value)) {
//             return value.map((v) => encodeURIComponent(v)).join("/");
//         }
//         return value !== undefined ? encodeURIComponent(String(value)) : "";
//     });

//     // Remove any trailing slashes; this can occur if there is no match for a catch-all slug ([[...slug]])
//     asPath = removeTrailingSlash(asPath);

//     // Ensure query values are strings
//     const record = Object.entries(remainingQuery).reduce<Record<string, string>>(
//         (prev, [key, value]) => {
//             prev[key] = [value].join("");
//             return prev;
//         },
//         {}
//     );

//     // Append remaining query as a querystring, if needed:
//     const qs = new URLSearchParams(record).toString();

//     if (qs) asPath += `?${qs}`;
//     if (hash) asPath += hash;

//     return asPath;
// }

// export const fromMetaUrlToPath = (
//     metaUrl: string,
//     query?: Record<string, string | number | string[] | number[]>
// ) => {
//     const path = metaUrl.split("://")[1];

//     return getRouteAsPath(
//         removeTrailingSlash(
//             path
//                 .replace(process.cwd(), "")
//                 .replace("/src/app", "")
//                 .replace("page.tsx", "")
//         ),
//         query ?? {}
//     );
// };
