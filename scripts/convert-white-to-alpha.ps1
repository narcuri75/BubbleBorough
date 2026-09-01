param(
  [Parameter(Mandatory = $true)] [string] $InputPath,
  [Parameter(Mandatory = $true)] [string] $OutputPath
)

Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $InputPath))
try {
  $result = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($result)
    try {
      $graphics.DrawImageUnscaled($source, 0, 0)
    } finally {
      $graphics.Dispose()
    }

    $rect = New-Object System.Drawing.Rectangle(0, 0, $result.Width, $result.Height)
    $data = $result.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $bytes = New-Object byte[] ([Math]::Abs($data.Stride) * $data.Height)
      [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
      for ($y = 0; $y -lt $result.Height; $y++) {
        for ($x = 0; $x -lt $result.Width; $x++) {
          $offset = ($y * $data.Stride) + ($x * 4)
          $blue = [int] $bytes[$offset]
          $green = [int] $bytes[$offset + 1]
          $red = [int] $bytes[$offset + 2]
          $minimum = [Math]::Min($red, [Math]::Min($green, $blue))
          $maximum = [Math]::Max($red, [Math]::Max($green, $blue))

          # Generated white canvases are neutral. Preserve saturated highlights in the asset.
          if ($minimum -ge 238 -and ($maximum - $minimum) -le 18) {
            $alpha = if ($minimum -ge 250) { 0 } else { [Math]::Round(255 * (250 - $minimum) / 12) }
            $bytes[$offset + 3] = [byte] [Math]::Max(0, [Math]::Min(255, $alpha))
          }
        }
      }
      [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    } finally {
      $result.UnlockBits($data)
    }

    $destination = [IO.Path]::GetFullPath($OutputPath)
    $result.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $result.Dispose()
  }
} finally {
  $source.Dispose()
}
