# Introduction 
This will provide a common location for joint learning material, including setup and installation instructions,
minimal example projects etc,. Please feel free to update it with any pain points you expecrienced
when getting set up, or anything you wish you had known ahead of time.

# Gotchas

1. Make sure you're using `wsl 2`. In theory this should installed by default, however in
   reality this dosen't seem to be guaranteed. Run `wsl -l --verbose` in your Windows powershell
   to list your installed distributions and their versions. You want to see something like
    ```bash
    PS C:\Users\daniel.tait> wsl -l --verbose
    NAME        STATE           VERSION
    * Ubuntu      Running         2
    ```
    If the version column gives 1, then follow [Microsoft's instructions](https://docs.microsoft.com/en-us/windows/wsl/install#upgrade-version-from-wsl-1-to-wsl-2)
    to upgrade the version.
