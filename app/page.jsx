"use client"

import React, { useState, useRef } from "react"
import Moveable from "react-moveable"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function ImageEditor() {
    const [baseImage, setBaseImage] = useState(null)
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 500, height: 500 })
    const [moveableKey, setMoveableKey] = useState(0)
    const targetRef = useRef(null)
    const canvasRef = useRef(null)
    const moveableRef = useRef(null)

    // Calculate initial crow position to be centered
    const getCrowInitialStyle = () => {
        const crowSize = 128 // 32 * 4 (w-32 h-32)
        return {
            position: "absolute",
            left: `${canvasDimensions.width / 2 - crowSize / 2}px`,
            top: `${canvasDimensions.height / 2 - crowSize / 2}px`,
            width: `${crowSize}px`,
            height: `${crowSize}px`,
        }
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    // Calculate new canvas dimensions based on image aspect ratio
                    let newDimensions
                    if (img.width > img.height) {
                        // Landscape image
                        const newHeight = (500 * img.height) / img.width
                        newDimensions = { width: 500, height: newHeight }
                    } else {
                        // Portrait or square image
                        const newWidth = (500 * img.width) / img.height
                        newDimensions = { width: newWidth, height: 500 }
                    }

                    setCanvasDimensions(newDimensions)
                    setBaseImage(e.target.result)

                    // Reset crow position to center of new canvas dimensions
                    if (targetRef.current) {
                        const newStyle = {
                            ...getCrowInitialStyle(),
                            transform: "", // Reset any previous transforms
                        }
                        Object.assign(targetRef.current.style, newStyle)
                    }

                    // Force Moveable to reinitialize with new canvas dimensions
                    setMoveableKey((prev) => prev + 1)

                    // Reset Moveable bounds after a short delay to ensure DOM has updated
                    setTimeout(() => {
                        if (moveableRef.current) {
                            moveableRef.current.updateRect()
                        }
                    }, 100)
                }
                img.src = e.target.result
            }
            reader.readAsDataURL(file)
        }
    }

    const downloadImage = async () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = canvasDimensions.width
        canvas.height = canvasDimensions.height

        try {
            // Draw background color
            ctx.fillStyle = "#f3f4f6"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw base image
            if (baseImage) {
                const img = new window.Image()
                img.src = baseImage
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                        resolve()
                    }
                    img.onerror = reject
                })
            }

            // Draw crow image with current transform
            if (targetRef.current) {
                const crowImg = new window.Image()
                crowImg.src = "/crow.png"
                await new Promise((resolve, reject) => {
                    crowImg.onload = () => {
                        const transform = targetRef.current.style.transform
                        const rect = targetRef.current.getBoundingClientRect()
                        const containerRect = canvasRef.current.getBoundingClientRect()

                        // Calculate relative position within the canvas
                        const relativeX = rect.left - containerRect.left
                        const relativeY = rect.top - containerRect.top

                        // Calculate scale from the transform matrix
                        const matrix = new DOMMatrix(transform)
                        const scale = Math.hypot(matrix.a, matrix.b)

                        // Get rotation angle in radians
                        const rotation = Math.atan2(matrix.b, matrix.a)

                        // Apply transformations in the correct order
                        ctx.save()

                        // Move to the center of where we want to draw the crow
                        ctx.translate(relativeX + rect.width / 2, relativeY + rect.height / 2)

                        // Apply rotation
                        ctx.rotate(rotation)

                        // Apply scale
                        ctx.scale(scale, scale)

                        // Draw the crow centered at the transformation point
                        const crowWidth = 128
                        const crowHeight = 128
                        ctx.drawImage(crowImg, -crowWidth / 2, -crowHeight / 2, crowWidth, crowHeight)

                        ctx.restore()
                        resolve()
                    }
                    crowImg.onerror = reject
                })
            }

            canvas.toBlob((blob) => {
                if (!blob) return
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "edited-image.png"
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }, "image/png")
        } catch (error) {
            console.error("Error generating image:", error)
        }
    }

    const moveableStyles = {
        handleStyles: {
            backgroundColor: "#ffffff",
            border: "2px solid #FF5733",
            borderRadius: "50%",
            width: "14px",
            height: "14px",
        },
        guidelineStyles: {
            backgroundColor: "#9B59B6",
            transition: "all 0.3s ease",
        },
        rotationHandleStyles: {
            backgroundColor: "#ffffff",
            border: "2px solid #3498DB",
            borderRadius: "50%",
            width: "16px",
            height: "16px",
        },
        frameStyles: {
            border: "2px solid #2ECC71",
            borderRadius: "4px",
        },
    }

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <Card className="p-4 w-fit flex justify-center">
                <div
                    ref={canvasRef}
                    className="relative bg-gray-100 rounded transition-all duration-300"
                    style={{
                        width: `${canvasDimensions.width}px`,
                        height: `${canvasDimensions.height}px`,
                        maxWidth: "100%",
                    }}
                >
                    {baseImage && (
                        <div className="absolute inset-0">
                            <img src={baseImage} className="w-full h-full" alt="Background" />
                        </div>
                    )}

                    {/* Crow Layer */}
                    <div ref={targetRef} style={getCrowInitialStyle()}>
                        <img src="/crow.png" alt="Crow" className="w-full h-full object-contain" />
                    </div>

                    {/* Moveable Controller with custom styles */}
                    <Moveable
                        ref={moveableRef}
                        key={moveableKey}
                        target={targetRef}
                        container={canvasRef.current}
                        draggable={true}
                        scalable={true}
                        rotatable={true}
                        snappable={true}
                        keepRatio={true}
                        throttleDrag={0}
                        throttleRotate={0}
                        throttleScale={0}
                        bounds={{ left: 0, top: 0, right: 0, bottom: 0, position: "css" }}
                        className="custom-moveable"
                        hideDefaultLines={false}
                        padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
                        origin={false}
                        handleStyles={moveableStyles.handleStyles}
                        guidelines={moveableStyles.guidelineStyles}
                        rotationHandleStyles={moveableStyles.rotationHandleStyles}
                        cssStyled={`
                          .moveable-control-box {
                              --moveable-color: #2ECC71;
                              --moveable-line-color: #2ECC71;
                              --moveable-handle-color: #FF5733;
                              --moveable-line-height: 2px;
                          }
                          .moveable-control-box .moveable-line {
                              background-color: #2ECC71 !important;
                              height: 2px !important;
                          }
                          .moveable-control-box .moveable-rotation-handle {
                              border-top: 2px solid #2ECC71 !important;
                          }
                          .moveable-control-box.moveable-selecto {
                              border: 2px solid #2ECC71 !important;
                          }
                      `}
                        onDrag={({ target, transform }) => {
                            target.style.transform = transform
                        }}
                        onScale={({ target, transform }) => {
                            target.style.transform = transform
                        }}
                        onRotate={({ target, transform }) => {
                            target.style.transform = transform
                        }}
                    />
                </div>
            </Card>

            <div className="text-sm text-gray-500 space-y-1">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => document.getElementById("imageUpload").click()}>
                        Upload Base Image
                    </Button>
                    <Button variant="outline" onClick={downloadImage}>
                        Download Image
                    </Button>
                    <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
            </div>
        </div>
    )
}
