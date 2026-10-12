Add-Type -AssemblyName System.Drawing

$width = 64
$height = 64
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# Draw phone handset using GraphicsPath
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

# Handset shape points (rotated slightly ~ -15 to -20 degrees for natural handset look, or classic diagonal handset)
# Standard silhouette: rounded top speaker pad, slender connecting arch, rounded bottom mic pad
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# Using Bezier handset polygon / path
# Let's define the outer and inner contour of a handset
$pts = @(
    [System.Drawing.PointF]::new(18, 12),
    [System.Drawing.PointF]::new(26, 12),
    [System.Drawing.PointF]::new(30, 20),
    [System.Drawing.PointF]::new(25, 25),
    [System.Drawing.PointF]::new(28, 31),
    [System.Drawing.PointF]::new(33, 36),
    [System.Drawing.PointF]::new(39, 39),
    [System.Drawing.PointF]::new(44, 34),
    [System.Drawing.PointF]::new(52, 38),
    [System.Drawing.PointF]::new(52, 46),
    [System.Drawing.PointF]::new(44, 52),
    [System.Drawing.PointF]::new(35, 50),
    [System.Drawing.PointF]::new(25, 43),
    [System.Drawing.PointF]::new(17, 33),
    [System.Drawing.PointF]::new(12, 23),
    [System.Drawing.PointF]::new(12, 17)
)
$path.AddClosedCurve($pts, 0.4)
$g.FillPath($brush, $path)

$outPath1 = "assets/phone-call.png"
$bmp.Save($outPath1, [System.Drawing.Imaging.ImageFormat]::Png)

$outPath2 = "c:/Users/LENOVO/Desktop/Textly/assets/phone-call.png"
if (Test-Path "c:/Users/LENOVO/Desktop/Textly/assets") {
    $bmp.Save($outPath2, [System.Drawing.Imaging.ImageFormat]::Png)
}

$brush.Dispose()
$path.Dispose()
$g.Dispose()
$bmp.Dispose()
Write-Host "phone-call.png generated successfully"
