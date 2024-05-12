User
document.addEventListener('DOMContentLoaded', () => {
    const importButton = document.getElementById('importButton');
    importButton.addEventListener('click', () => {
        // Simulate click on the hidden file input
        document.getElementById('fileInput').click();
    });

    // Add event listener for the reset button
    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', resetDisplay);

    // Listen for file input change
    document.getElementById('fileInput').addEventListener('change', importAndSplitImage);
});

let isFirstFile = true; // Track if it's the first file
let redLine = document.getElementById('redLine');

function resetDisplay() {
    const imageInfo = document.getElementById('imageInfo');
    const imageContainer = document.getElementById('imageContainer');

    // Clear image info
    imageInfo.textContent = '';

    // Remove all images from the container
    while (imageContainer.firstChild) {
        imageContainer.removeChild(imageContainer.firstChild);
    }

    isFirstFile = true; // Reset the flag for the first file
    redLine.style.opacity = 0; // Hide the red line

}

function importAndSplitImage() {
    // Get the file input element, image info element, and image container element
    const fileInput = document.getElementById('fileInput');
    const imageInfo = document.getElementById('imageInfo');
    const imageContainer = document.getElementById('imageContainer');

    // Check if there are files selected
    if (fileInput.files.length > 0) {
        // Iterate over each selected file
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            // Check if the file is an image
            if (file.type.startsWith('image/')) {
                // Display information about the selected image
                imageInfo.textContent += `Selected Image ${i + 1}: ${file.name}\n`;
                // Create a new file reader
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Create a new image element
                    const img = new Image();
                    img.onload = function() {
                        // Create a canvas and get its 2D context
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        // Set the canvas dimensions to match the image dimensions
                        canvas.width = img.width;
                        canvas.height = img.height;
                        // Draw the image onto the canvas
                        ctx.drawImage(img, 0, 0);
                        // Get the image data from the canvas
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const { data, width, height } = imageData;
                        const splits = [];
                        // threadhold for white space pixels
                
                        let startY = 0;
                        let endY = 0;
                        let isWhiteSpace = true;
                        // Iterate over each row of pixels in the image
                        for (let y = 0; y < height; y++) {
                            let isRowWhiteSpace = true;
                            // Check each pixel in the row to determine if it's white space
                            for (let x = 0; x < width; x++) {
                                const index = (y * width + x) * 4;
                                const red = data[index];
                                const green = data[index + 1];
                                const blue = data[index + 2];
                                // If a non-white pixel is found, the row is not white space
                                if (red !== 255 || green !== 255 || blue !== 255) {
                                    isRowWhiteSpace = false;
                                    break;
                                }
                            }
                            // Determine if the row is white space or part of the image
                            if (isRowWhiteSpace && !isWhiteSpace) {
                                endY = y;
                                // Add the split to the list of splits
                                const split = ctx.getImageData(0, startY, width, endY - startY);
                                splits.push(split);
                            } else if (!isRowWhiteSpace && isWhiteSpace) {
                                startY = y;
                            }
                            isWhiteSpace = isRowWhiteSpace;
                        }
                        // If the last row is not white space, add the split
                        if (!isWhiteSpace) {
                            endY = height;
                            const split = ctx.getImageData(0, startY, width, endY - startY);
                            splits.push(split);
                        }
                        // Append the splits to the image container
                        appendSplits(splits, imageContainer, isFirstFile);
                        // Update isFirstFile flag after processing the first file
                        isFirstFile = false;
                    };
                    // Set the source of the image to the loaded data URL
                    img.src = e.target.result;
                };
                // Read the file as a data URL
                reader.readAsDataURL(file);
            } else {
                // Display an error message for non-image files
                imageInfo.textContent += `Please select an image file for Image ${i + 1}\n`;
            }
        }
    } else {
        // Display a message if no files are selected
        imageInfo.textContent = 'No files selected.';
    }
}



function appendSplits(splits, container) {
    const sheetMusicContainer = container.querySelector('.sheet-music-container') || document.createElement('div');
    sheetMusicContainer.classList.add('sheet-music-container');

    splits.forEach((split, index) => {
        const isStripEmpty = checkIfStripEmpty(split);
        if (!isStripEmpty) {
            const trimmedSplit = index === 0 ? split : trimLeftWhiteSpace(split, isFirstFile, index === 1); // Pass isFirstStrip as true for the first image
            const image = new Image();
            image.src = getImageDataURL(trimmedSplit);
            image.classList.add('strip'); // Add the 'strip' class

            // Wait for the browser to calculate and render the sheetMusicContainer height
            setTimeout(() => {
                const sheetMusicContainerHeight = sheetMusicContainer.offsetHeight;
                if (trimmedSplit.height >= sheetMusicContainerHeight * 0.4) {
                    sheetMusicContainer.appendChild(image);
                }
            }, 0);
        }
            // Toggle red line visibility

            redLine.style.opacity = 0.5;
            container.appendChild(sheetMusicContainer);
            
    });

    // Append the sheet music container after the last strip of the previous image
    if (!container.contains(sheetMusicContainer)) {
        container.appendChild(sheetMusicContainer);
    }

    lastStripPosition = sheetMusicContainer.offsetTop + sheetMusicContainer.offsetHeight; // Update the last strip position
}

function trimLeftWhiteSpace(imageData, isFirstFile, isFirstStrip) {
    const { data, width, height } = imageData;
    let leftmostX = width;
    let rightmostX = 0;
    
    // Find the leftmost and rightmost non-white pixels
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            if (red < 240 || green < 240 || blue < 240) {
                leftmostX = Math.min(leftmostX, x);
                rightmostX = Math.max(rightmostX, x);
                break;
            }
        }
    }
    
    // Apply additional trimming
    let leftOffset = -65; // Default offset
    if (isFirstFile && isFirstStrip) {
        // If it's the first strip of the first file, don't trim
        leftOffset = 0;
    }
    
    leftmostX = Math.max(0, leftmostX - leftOffset);
    
    // Create a new image data with trimmed whitespace
    const trimmedWidth = rightmostX - leftmostX + 1;
    const trimmedData = new Uint8ClampedArray(trimmedWidth * height * 4);
    for (let x = 0; x < trimmedWidth; x++) {
        for (let y = 0; y < height; y++) {
            const index = (y * width + x + leftmostX) * 4;
            const trimmedIndex = (y * trimmedWidth + x) * 4;
            trimmedData[trimmedIndex] = data[index];
            trimmedData[trimmedIndex + 1] = data[index + 1];
            trimmedData[trimmedIndex + 2] = data[index + 2];
            trimmedData[trimmedIndex + 3] = data[index + 3];
        }
    }
    
    return new ImageData(trimmedData, trimmedWidth, height);
}



function checkIfStripEmpty(imageData) {
    const { data, width, height } = imageData;
    const threshold = width * height * 0.9; // Set a threshold for emptiness (90% white)
    let whiteCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        // Check if the pixel is white (or a similar color)
        if (red >= 240 && green >= 240 && blue >= 240) {
            whiteCount++;
            // If the number of white pixels exceeds the threshold, consider the strip empty
            if (whiteCount >= threshold) {
                return true;
            }
        }
    }
    return false;
}



function getImageDataURL(imageData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}
