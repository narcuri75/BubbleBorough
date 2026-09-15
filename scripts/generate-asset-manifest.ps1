$ErrorActionPreference = "Stop"

# Preserve the curated manifest and add image files that have been introduced
# since its last build. Fish death-stage artwork stays out of this list because
# it is loaded by the dedicated undead resolver.
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "assets/asset-manifest.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$spriteCatalogJson = & node (Join-Path $PSScriptRoot "generate-sprite-sheets.cjs") --catalog
if ($LASTEXITCODE -ne 0) { throw "Could not generate sprite sheet mappings" }
$spriteCatalog = $spriteCatalogJson | ConvertFrom-Json
$spriteSheetPaths = @($spriteCatalog | ForEach-Object { $_.path })

# Preserve logical keys for saves and catalogs. The runtime resolves these keys
# to sheet rectangles, and full sheets must never become purchasable artwork.
foreach ($sheet in $spriteCatalog) {
  $category = $sheet.category
  if (-not $manifest.PSObject.Properties[$category]) { continue }
  $manifest.$category = @($manifest.$category | Where-Object { ($_.path -split '[?#]')[0] -notin $spriteSheetPaths })
  $known = @($manifest.$category | ForEach-Object { $_.key })
  $manifest.$category = @($manifest.$category) + @($sheet.assets | Where-Object { $_.key -notin $known })
}

# Background PNGs remain editable source assets, while the runtime manifest
# points at their substantially smaller generated WebP delivery files.
if ($manifest.PSObject.Properties["backgrounds"]) {
  foreach ($entry in $manifest.backgrounds) {
    $deliveryPath = Join-Path $root ("assets/generated/backgrounds/{0}.webp" -f $entry.key)
    if (Test-Path -LiteralPath $deliveryPath -PathType Leaf) {
      $entry.path = "assets/generated/backgrounds/$($entry.key).webp"
    }
  }
}

# Retire catalog sections whose asset directories were removed.
foreach ($property in @($manifest.PSObject.Properties)) {
  $categoryPath = Join-Path $root (Join-Path "assets" $property.Name)
  if (-not (Test-Path -LiteralPath $categoryPath -PathType Container)) {
    $manifest.PSObject.Properties.Remove($property.Name)
  }
}

function Add-MissingImageAssets([string]$category, [string]$directory, [scriptblock]$include = $null) {
  $assetDirectory = Join-Path $root (Join-Path "assets" $directory)
  if (-not (Test-Path -LiteralPath $assetDirectory)) { return }
  if (-not $manifest.PSObject.Properties[$category]) {
    $manifest | Add-Member -NotePropertyName $category -NotePropertyValue @()
  }
  $known = @($manifest.$category | ForEach-Object { $_.key })
  $additions = Get-ChildItem -LiteralPath $assetDirectory -File -Recurse |
    Where-Object { $_.Extension -match '^\.(png|jpe?g|webp)$' } |
    Where-Object { "assets/$directory/$($_.Name)" -notin $spriteSheetPaths } |
    Where-Object { -not $include -or (& $include $_.Name) } |
    Where-Object { $_.Name -notin $known } |
    Sort-Object Name |
    ForEach-Object {
      $relativePath = $_.FullName.Substring($assetDirectory.Length).TrimStart([char[]]"\/").Replace('\', '/')
      [pscustomobject]@{
        key = $_.Name
        path = "assets/$directory/$relativePath"
      }
    }
  if ($additions.Count) {
    $manifest.$category = @($manifest.$category) + @($additions)
  }
}

Add-MissingImageAssets "decor" "decor"
Add-MissingImageAssets "fish" "fish" { param($name) $name -notmatch '_(zombie|skeleton)\.[^.]+$' }
Add-MissingImageAssets "equipment" "equipment"

# Nested discovery above can see the physical sheet files. Keep only their
# logical frame entries in purchasable catalog sections.
foreach ($sheet in $spriteCatalog) {
  $category = $sheet.category
  if ($manifest.PSObject.Properties[$category]) {
    $manifest.$category = @($manifest.$category | Where-Object { ($_.path -split '[?#]')[0] -ne $sheet.path })
  }
}

# Remove stale entries written before nested equipment folders were supported.
if ($manifest.PSObject.Properties["equipment"]) {
  $manifest.equipment = @($manifest.equipment | Where-Object { $_.path -notmatch '^assets/equipment/(?:Boat|Submarine|Food_Dispenser)' })
}

# Boat and submarine frames now live under equipment/machinery rather than the
# historical fish catalog directory.
if ($manifest.PSObject.Properties["fish"]) {
  $manifest.fish = @($manifest.fish | Where-Object { $_.path -notmatch '^assets/fish/(?:Halloween_)?(?:boat|submarine)(?:_[0-9]+)?\.png$' })
}

$manifestJson = $manifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))
