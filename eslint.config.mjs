import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**", "node_modules/**", "scripts/**", "shots/**"] }];

export default config;
