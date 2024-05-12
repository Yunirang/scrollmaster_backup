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

// Track the last strip position
let lastStripPosition = 0;
// Track if it's the first strip



let isFirstStrip = true; // Track if it's the first strip
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
                imageInfo.textContent += `Image ${i + 1}: ${file.name};\n`;
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
                        // Threshold for considering a row as part of the musical lines
                        const blackThreshold = width / 1e25; // Adjust as needed
                        let startY = 0;
                        let endY = 0;
                        let isWhiteSpace = true;
                        // Iterate over each row of pixels in the image
                        for (let y = 0; y < height; y++) {
                            let blackCount = 0; // Track the count of black pixels in a row
                            // Check each pixel in the row to determine if it's white space
                            for (let x = 0; x < width; x++) {
                                const index = (y * width + x) * 4;
                                const red = data[index];
                                const green = data[index + 1];
                                const blue = data[index + 2];
                                // If a black pixel is found, increment the count
                                if (red < 10 && green < 10 && blue < 10) {
                                    blackCount++;
                                }
                            }
                            // Determine if the row is white space or part of the image
                            if (blackCount <= blackThreshold) {
                                // Row contains mostly white pixels, consider it white space
                                if (!isWhiteSpace) {
                                    // If transitioning from musical lines to white space, add split
                                    endY = y;
                                    const split = ctx.getImageData(0, startY, width, endY - startY);
                                    splits.push(split);
                                }
                                isWhiteSpace = true;
                            } else {
                                // Row contains musical lines
                                if (isWhiteSpace) {
                                    // If transitioning from white space to musical lines, update start position
                                    startY = y;
                                }
                                isWhiteSpace = false;
                            }
                        }
                        // If the last row is not white space, add the split
                        if (!isWhiteSpace) {
                            endY = height;
                            const split = ctx.getImageData(0, startY, width, endY - startY);
                            splits.push(split);
                        }
                        // Append the splits to the image container
                        appendSplits(splits, imageContainer, isFirstFile);
                   
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

function appendSplits(splits, container, isFirstFile) {
    
    let sheetMusicContainer = container.querySelector('.sheet-music-container');
    if (!sheetMusicContainer) {
        sheetMusicContainer = document.createElement('div');
        sheetMusicContainer.classList.add('sheet-music-container');
        container.appendChild(sheetMusicContainer);
    }

    let totalStrips = 0; // Initialize the total strips counter
    let splitsCount = splits.length;
    let theEnd = false;

    splits.forEach((split, index) => {
        const isStripEmpty = checkIfStripEmpty(split);
        if (!isStripEmpty) {
            const trimmedSplit = index > 0 ? trimLeftWhiteSpace(split, isFirstFile, isFirstStrip) : split;
            isFirstStrip = false;
            const image = new Image();
            image.src = getImageDataURL(trimmedSplit);
            image.classList.add('strip', `strip${index}`); // Dynamically assign class name
            
            // Listen for the load event of the image
            image.onload = () => {
                if (totalStrips == splitsCount && !theEnd) {
                    console.log('All images loaded');
                    centerStrips();
                    theEnd = true;
                }
            };
            
            setTimeout(() => {
                const sheetMusicContainerHeight = sheetMusicContainer.offsetHeight;
                if (trimmedSplit.height >= sheetMusicContainerHeight * 0.4 && trimmedSplit.height >= 40) {
                    sheetMusicContainer.appendChild(image);
                    totalStrips++; // Increment totalStrips only when a strip is appended
                    
                } else {
                    splitsCount--; // Decrement splitsCount if the strip is too small
                }
            }, 0);
        } else {
            splitsCount--;
        }
    });
    // print the sheet_music_container height 
   
    lastStripPosition = sheetMusicContainer.offsetTop + sheetMusicContainer.offsetHeight; 
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

    // Apply additional trimming
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

function centerStrips() {
    const containers = document.querySelectorAll('.sheet-music-container');
    const sheetMusicContainer = document.querySelector('.sheet-music-container');
    const sheetMusicContainerHeight = sheetMusicContainer.offsetHeight;

    const imageContainer = document.getElementById('imageContainer');



    redLine.style.opacity = 0.5; // Show the red line
    console.log(sheetMusicContainerHeight);
    redLine.style.height = sheetMusicContainerHeight +'px'; // Set the height of the red line

    // have the redLine be exactly contained within the sheet music container
    redLine.style.top = sheetMusicContainer.offsetTop + 'px';

    // but cut off the bottom and top 5% of the redLine
    redLine.style.clip = `rect(${sheetMusicContainerHeight * 0.05}px, auto, ${sheetMusicContainerHeight * 0.95}px, auto)`;





    imageContainer.appendChild(redLine); // Append the red line after the last strip

    containers.forEach(container => {
        const strips = container.querySelectorAll('.strip');
        strips.forEach((strip) => {
            // Calculate the margin to center the strip vertically
            const stripHeight = strip.offsetHeight;
            const margin = sheetMusicContainerHeight / 2 - stripHeight / 2;
            
            // Set the margin-bottom property of the strip
            strip.style.marginBottom = margin + 'px';
        });
    });
}






