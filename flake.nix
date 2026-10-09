{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    # Prisma's CLI and native engines must match the bot's 5.22.0 client.
    prisma-nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    bun = {
      url = "github:Daste745/nix-bun";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    systems.url = "github:nix-systems/default";
  };

  outputs =
    { systems, nixpkgs, prisma-nixpkgs, bun, ... }:
    let
      eachSystem =
        f:
        nixpkgs.lib.genAttrs (import systems) (
          system:
          f {
            inherit system;
            pkgs = import nixpkgs { inherit system; };
            prismaPkgs = import prisma-nixpkgs { inherit system; };
          }
        );
    in
    {
      devShells = eachSystem (
        { system, pkgs, prismaPkgs }:
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              bun.packages.${system}."1.4.0"
              prismaPkgs.prisma
              prismaPkgs.prisma-engines
              openssl
            ];
            shellHook = ''
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig";
              export PRISMA_SCHEMA_ENGINE_BINARY="${prismaPkgs.prisma-engines}/bin/schema-engine"
              export PRISMA_QUERY_ENGINE_BINARY="${prismaPkgs.prisma-engines}/bin/query-engine"
              export PRISMA_QUERY_ENGINE_LIBRARY="${prismaPkgs.prisma-engines}/lib/libquery_engine.node"
              export PRISMA_FMT_BINARY="${prismaPkgs.prisma-engines}/bin/prisma-fmt"
            '';
          };
        }
      );
    };
}
