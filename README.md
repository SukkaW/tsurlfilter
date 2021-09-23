# TSUrlFilter

## Packages:

- tsurlfilter
- examples/manifest-v2
- examples/manifest-v3

See packages details in `./packages`

TODO:
- [ ] write packages description here
- [ ] check all commands through lerna
- [ ] check bamboo specks
- [ ] clean up dev dependencies in packages (lerna link convert)
- [ ] examples build

```
$ lerna bootstrap
```

Bootstrap the packages in the current repo. Installing all their dependencies and linking any cross-dependencies.

```
$ lerna run test
```

Runs tests in all packages.

```
$ lerna run build
```

Builds the packages in the current repo.
