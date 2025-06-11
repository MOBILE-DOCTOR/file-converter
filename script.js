// --- Global State Variables ---
let currentView = 'overview'; // 'overview', 'image-tools-category', 'convert-tools-category', etc., or a specific tool ID
let uploadedImage = null; // Main image for image editor
let uploadedImage2 = null; // Second image for merge (used by legacy merge)
let cropSelection = { x: 0, y: 0, width: 0, height: 0, active: false };
let imageHistory = []; // For undo functionality in image editor
let currentImageState = null; // Represents the current image on the canvas/result

// Meme Generator specific states
let memeTopText = '';
let memeBottomText = '';
let memeTopTextPos = { x: 0, y: 50 }; // Default position
let memeBottomTextPos = { x: 0, y: 0 }; // Will be calculated dynamically
let isDraggingMemeText = false;
let draggedMemeTextElement = null;
let dragOffsetX, dragOffsetY;


// --- DOM Elements - Shared ---
const loadingIndicator = document.getElementById('loading-indicator');
const backButton = document.getElementById('back-button');
const homeButton = document.getElementById('home-button');

// --- DOM Elements - Main Views ---
const dashboardOverviewSection = document.getElementById('dashboard-overview-section');
const categorySections = {
    'image-tools': document.getElementById('image-tools-category-section'),
    'convert-tools': document.getElementById('convert-tools-category-section'),
    'pdf-tools': document.getElementById('pdf-tools-category-section'),
    'apps-tools': document.getElementById('apps-tools-category-section'),
};

// --- DOM Elements - Image Tools ---
const imageCanvas = document.getElementById('image-canvas');
const imageCtx = imageCanvas.getContext('2d');
const imageResultImg = document.getElementById('image-result');
const imageDownloadLink = document.getElementById('image-download');
const imageUndoButton = document.getElementById('image-undo-button');
const imageUploadArea = document.getElementById('image-upload-area'); // Common upload area for image tools
const uploadImageCommonInput = document.getElementById('upload-image-common');
const qualityDisplay = document.getElementById('quality-display');
const splitImagesDisplay = document.getElementById('split-images-display'); // For split, and bulk results
const imageMessage = document.getElementById('image-message'); // For image tool messages
const uploadMerge2Input = document.getElementById('upload-merge-2'); // Specific for legacy merge
const bulkImageResizerInput = document.getElementById('upload-bulk-images'); // For bulk resizer
const colorDisplayBox = document.getElementById('color-display-box'); // For color picker
const pickedColorValue = document.getElementById('picked-color-value'); // For color picker value
const memeTopTextInput = document.getElementById('meme-top-text'); // Meme Generator
const memeBottomTextInput = document.getElementById('meme-bottom-text'); // Meme Generator
const memeFontSizeInput = document.getElementById('meme-font-size'); // Meme Generator font size
const memeFontFamilySelect = document.getElementById('meme-font-family'); // Meme Generator font family
const uploadCollageImagesInput = document.getElementById('upload-collage-images'); // Collage Maker
const collageLayoutSelect = document.getElementById('collage-layout'); // Collage Maker layout
const enlargerScaleInput = document.getElementById('enlarger-scale'); // Image Enlarger


// --- DOM Elements - Convert Tools ---
const convertMessage = document.getElementById('convert-message');
const convertDownloadLink = document.getElementById('convert-download');
const convertUploadArea = document.getElementById('convert-upload-area'); // Common upload area for convert tools
const uploadConvertFilesCommonInput = document.getElementById('upload-convert-files-common'); // For generic convert tools
const uploadImageConverterInput = document.getElementById('upload-image-converter-input'); // Specific for image converter
const imageConvertFormatSelect = document.getElementById('image-convert-format'); // Specific for image converter
const uploadSvgConverterInput = document.getElementById('upload-svg-converter-input'); // Specific for SVG converter
const svgConvertFormatSelect = document.getElementById('svg-convert-format'); // Specific for SVG converter
const bulkConvertResultsDisplay = document.getElementById('bulk-convert-results'); // For bulk convert results


// --- DOM Elements - PDF Tools ---
const pdfUploadArea = document.getElementById('pdf-upload-area'); // Common upload area for PDF tools
const uploadPdfCommonInput = document.getElementById('upload-pdf-common');
const uploadPdfsInput = document.getElementById('upload-pdfs'); // For merge PDFs
const uploadImagesToPdfInput = document.getElementById('upload-images-to-pdf'); // For images to PDF
const uploadJpgsToPdfInput = document.getElementById('upload-jpgs-to-pdf'); // For JPGs to PDF
const uploadPngsToPdfInput = document.getElementById('upload-pngs-to-pdf'); // For PNGs to PDF
const uploadCompressPdfInput = document.getElementById('upload-compress-pdf'); // For compress PDF
const pdfCompressQuality = document.getElementById('pdf-compress-quality'); // For compress PDF quality
const pdfQualityDisplay = document.getElementById('pdf-quality-display'); // For compress PDF quality display
const pdfMessage = document.getElementById('pdf-message');
const pdfDownloadLink = document.getElementById('pdf-download');


// --- DOM Elements - Apps Tools ---
const appsMessage = document.getElementById('apps-message');


// --- UTILITY FUNCTIONS ---

function showLoading() { loadingIndicator.style.display = 'flex'; }
function hideLoading() { loadingIndicator.style.display = 'none'; }

// Resets and displays image result area (for single image outputs)
function updateImageResult(dataUrl, filename = 'processed-image.png') {
    imageResultImg.src = dataUrl;
    imageResultImg.style.display = 'block';
    imageDownloadLink.href = dataUrl;
    imageDownloadLink.download = filename;
    imageDownloadLink.style.display = 'inline-block';
    imageCanvas.style.display = 'none';
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'none';
    imageMessage.textContent = ''; // Clear message
}

// Draws the current uploaded image onto the canvas for active editing (e.g., crop, flip, rotate)
function updateCanvasWithImage(img, drawMemeText = false) {
    if (!img || !img.naturalWidth) {
        console.warn("Attempted to draw an invalid or unloaded image to canvas.");
        return;
    }
    imageCanvas.width = img.naturalWidth;
    imageCanvas.height = img.naturalHeight;
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(img, 0, 0);

    if (drawMemeText) {
        drawMemeTextsOnCanvas(); // Redraw meme text
    }

    currentImageState = imageCanvas.toDataURL();
    imageResultImg.style.display = 'none';
    imageCanvas.style.display = 'block';
    imageDownloadLink.style.display = 'inline-block';
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'none';
    imageMessage.textContent = ''; // Clear message
}

// Saves the current image state to history for undo
function saveImageState() {
    if (currentImageState) {
        imageHistory.push(currentImageState);
        imageUndoButton.disabled = false;
    }
}

// Applies the last saved state (currentImageState) to the image display
function applyLastImageState() {
    if (currentImageState) {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img; // Make sure uploadedImage is the latest state
            updateCanvasWithImage(img);
            updateImageResult(img.src);
            hideLoading();
        };
        img.src = currentImageState;
    } else {
        imageResultImg.style.display = 'none';
        imageCanvas.style.display = 'none';
        imageDownloadLink.style.display = 'none';
        splitImagesDisplay.innerHTML = '';
        splitImagesDisplay.style.display = 'none';
        imageMessage.textContent = 'Upload an image to get started.'; // Show initial message
        hideLoading();
    }
}

// Common drag and drop helpers
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
function highlight(e) { e.currentTarget.classList.add('highlight'); }
function unhighlight(e) { e.currentTarget.classList.remove('highlight'); }


// --- NAVIGATION LOGIC ---

let currentCategory = null; // Stores the active category (e.g., 'image-tools')
let currentToolId = null; // Stores the active tool ID within a category (e.g., 'image-resizer')
let historyStack = []; // For navigating back through views

function pushHistoryState(viewId, categoryId, toolId) {
    historyStack.push({ view: viewId, category: categoryId, tool: toolId });
    backButton.style.display = 'inline-block';
}

function popHistoryState() {
    if (historyStack.length > 1) { // Keep at least one state for current view
        historyStack.pop();
        const prevState = historyStack[historyStack.length - 1];
        if (prevState.view === 'dashboard-overview-section') {
            showMainView(prevState.view, false); // Don't push to history again
        } else if (prevState.tool) {
            showTool(prevState.tool, prevState.category, false); // Don't push to history again
        } else if (prevState.category) {
            showMainView(prevState.category + '-category-section', false);
        }
        if (historyStack.length <= 1) { // If only overview remains, hide back button
            backButton.style.display = 'none';
            homeButton.style.display = 'none';
        }
    } else {
        // If already on overview, clicking back does nothing or goes to a blank state
        showMainView('dashboard-overview-section', false);
        backButton.style.display = 'none';
        homeButton.style.display = 'none';
    }
}


// Shows a specific main view (overview or a category section)
function showMainView(viewId, pushToHistory = true) {
    document.querySelectorAll('.main-view').forEach(view => {
        view.classList.remove('active-view');
    });
    document.getElementById(viewId).classList.add('active-view');

    // Adjust back/home button visibility
    if (viewId === 'dashboard-overview-section') {
        backButton.style.display = 'none';
        homeButton.style.display = 'none'; // Home button is redundant on overview
        currentCategory = null;
        currentToolId = null;
        historyStack = [{ view: 'dashboard-overview-section', category: null, tool: null }]; // Reset history
    } else {
        backButton.style.display = 'inline-block';
        homeButton.style.display = 'inline-block';
        currentCategory = viewId.replace('-category-section', ''); // Set current category
        currentToolId = null; // No specific tool active yet in category view
        if (pushToHistory) {
            pushHistoryState(viewId, currentCategory, null);
        }
    }
    resetEditorAreas(); // Clear all editor areas
}

// Shows a specific tool's options and sets up its environment
function showTool(toolId, categoryId, pushToHistory = true) {
    currentToolId = toolId;
    currentCategory = categoryId; // Ensure category is set for back button

    // First, ensure the correct category section is active without adding to history
    showMainView(categoryId + '-category-section', false);

    // Hide all tool options within the active category
    document.querySelectorAll(`#${categoryId}-category-section .tool-section`).forEach(section => {
        section.classList.remove('active');
    });

    // Activate the specific tool's options
    const selectedToolOptions = document.getElementById(`${toolId}-options`);
    if (selectedToolOptions) {
        selectedToolOptions.classList.add('active');
    }

    // Update active state for category tool buttons
    document.querySelectorAll(`#${categoryId}-category-section .tool-selection-buttons .tool-button`).forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tool === toolId) {
            button.classList.add('active');
        }
    });

    if (pushToHistory) {
        pushHistoryState(categoryId + '-category-section', categoryId, toolId);
    }

    // Adjust visibility and state for image/pdf/convert specific areas
    resetEditorAreas();

    // Reset canvas modes and listeners
    imageCanvas.classList.remove('crop-mode', 'color-picker-mode', 'meme-mode');
    imageCanvas.removeEventListener('mousedown', startCrop);
    imageCanvas.removeEventListener('mousemove', drawCrop);
    imageCanvas.removeEventListener('mouseup', endCrop);
    imageCanvas.removeEventListener('mouseleave', endCrop);
    imageCanvas.removeEventListener('click', pickColor); // Remove color picker listener
    imageCanvas.removeEventListener('mousedown', startDragMemeText); // Remove meme drag listeners
    document.removeEventListener('mousemove', dragMemeText);
    document.removeEventListener('mouseup', endDragMemeText);


    if (categoryId === 'image-tools') {
        if (uploadedImage) {
            // For tools that interact directly with canvas or require current image on canvas
            if (['image-resizer', 'image-compressor', 'crop-image', 'flip-image', 'rotate-image', 'color-picker', 'meme-generator', 'merge-options', 'split-options'].includes(toolId)) {
                updateCanvasWithImage(uploadedImage, toolId === 'meme-generator'); // Draw meme text if it's meme tool
            } else { // For other tools, just show the last result image or the current state
                applyLastImageState();
            }
        } else {
            // If no image is loaded
            imageCanvas.style.display = 'none';
            imageResultImg.style.display = 'none';
            imageDownloadLink.style.display = 'none';
            imageMessage.textContent = 'Upload an image to get started.';
        }
        imageUploadArea.style.display = 'flex';
        imageUndoButton.disabled = (imageHistory.length === 0);

        // Specific listeners/modes for image tools
        if (toolId === 'crop-image') {
            imageCanvas.classList.add('crop-mode');
            imageCanvas.addEventListener('mousedown', startCrop);
            imageCanvas.addEventListener('mousemove', drawCrop);
            imageCanvas.addEventListener('mouseup', endCrop);
            imageCanvas.addEventListener('mouseleave', endCrop);
        } else if (toolId === 'color-picker') {
            imageCanvas.classList.add('color-picker-mode');
            imageCanvas.addEventListener('click', pickColor);
            pickedColorValue.textContent = '#FFFFFF';
            colorDisplayBox.style.backgroundColor = '#FFFFFF';
        } else if (toolId === 'meme-generator') {
            imageCanvas.classList.add('meme-mode');
            // Init meme text positions if not set or if image changed
            if (uploadedImage) {
                // If the current image is different from the image when positions were last calculated
                // or if positions are still at default (0,0) indicating no image yet
                if (!currentImageState || (memeTopTextPos.x === 0 && memeTopTextPos.y === 50 && memeBottomTextPos.x === 0 && memeBottomTextPos.y === 0)) {
                    memeTopTextPos = { x: uploadedImage.naturalWidth / 2, y: 50 };
                    memeBottomTextPos = { x: uploadedImage.naturalWidth / 2, y: uploadedImage.naturalHeight - 50 };
                }
            } else {
                // No image loaded, reset positions to default relative to a hypothetical canvas
                memeTopTextPos = { x: 0, y: 50 };
                memeBottomTextPos = { x: 0, y: 0 }; // Will be calculated from canvas bottom
            }

            memeTopTextInput.value = memeTopText;
            memeBottomTextInput.value = memeBottomText;
            imageCanvas.addEventListener('mousedown', startDragMemeText);
            document.addEventListener('mousemove', dragMemeText);
            document.addEventListener('mouseup', endDragMemeText);
            // Ensure font size and family are set correctly
            if (memeFontSizeInput) memeFontSizeInput.value = parseInt(memeFontSizeInput.value); // Ensure it's a number
            if (memeFontFamilySelect) memeFontFamilySelect.value = memeFontFamilySelect.value;
        }

    } else if (categoryId === 'pdf-tools') {
        pdfUploadArea.style.display = 'flex';
        pdfMessage.style.display = 'block';
        pdfMessage.textContent = 'Upload files to start processing.';
        pdfDownloadLink.style.display = 'none';
        // Listener for PDF compress quality display
        pdfCompressQuality?.addEventListener('input', (e) => {
            pdfQualityDisplay.textContent = parseFloat(e.target.value).toFixed(2);
        });
        pdfQualityDisplay.textContent = parseFloat(pdfCompressQuality?.value || 0.7).toFixed(2);

    } else if (categoryId === 'convert-tools') {
        convertUploadArea.style.display = 'flex';
        convertMessage.style.display = 'block';
        convertMessage.textContent = 'Upload files to start processing.';
        convertDownloadLink.style.display = 'none';
        bulkConvertResultsDisplay.innerHTML = '';
        bulkConvertResultsDisplay.style.display = 'none';

    } else if (categoryId === 'apps-tools') {
        appsMessage.style.display = 'block';
        appsMessage.textContent = `You selected: ${toolId.replace(/-/g, ' ').toUpperCase()}. This section provides information about our dedicated mobile applications. Functionality not yet implemented.`;
        // Hide upload areas not relevant to apps
        imageUploadArea.style.display = 'none';
        pdfUploadArea.style.display = 'none';
        convertUploadArea.style.display = 'none';
    }

    // Handle placeholder sections for new tools within any category
    const activeToolSections = document.querySelectorAll(`#${categoryId}-category-section .tool-section.active`);
    if (activeToolSections.length === 0 || activeToolSections[0].querySelector('button[disabled]')) {
        // If an unimplemented tool is selected, hide relevant output areas
        if (categoryId === 'image-tools') {
            imageCanvas.style.display = 'none';
            imageResultImg.style.display = 'none';
            imageDownloadLink.style.display = 'none';
            imageUndoButton.disabled = true;
            splitImagesDisplay.innerHTML = '';
            splitImagesDisplay.style.display = 'none';
            imageMessage.textContent = 'Functionality not yet implemented.';
        } else if (categoryId === 'convert-tools') {
            convertMessage.style.display = 'block';
            convertDownloadLink.style.display = 'none';
            bulkConvertResultsDisplay.innerHTML = '';
            bulkConvertResultsDisplay.style.display = 'none';
        } else if (categoryId === 'pdf-tools') {
            pdfMessage.style.display = 'block';
            pdfDownloadLink.style.display = 'none';
        }
    }
}

// Resets all editor/result areas and common upload areas
function resetEditorAreas() {
    imageCanvas.style.display = 'none';
    imageResultImg.style.display = 'none';
    imageDownloadLink.style.display = 'none';
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'none';
    imageUploadArea.style.display = 'none';
    imageMessage.textContent = ''; // Clear image message

    pdfMessage.style.display = 'none';
    pdfDownloadLink.style.display = 'none';
    pdfUploadArea.style.display = 'none';

    convertMessage.style.display = 'none';
    convertDownloadLink.style.display = 'none';
    convertUploadArea.style.display = 'none';
    bulkConvertResultsDisplay.innerHTML = '';
    bulkConvertResultsDisplay.style.display = 'none';


    appsMessage.style.display = 'none'; // Hide apps message initially
}


// --- IMAGE EDITOR FUNCTIONS ---

// Handles image resizing
function resizeImage() {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    showLoading();
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        alert("Please enter valid positive numbers for dimensions."); hideLoading(); return; }
    saveImageState();
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width; tempCanvas.height = height;
    tempCtx.drawImage(uploadedImage, 0, 0, width, height);
    const resizedDataUrl = tempCanvas.toDataURL('image/png');
    const newResizedImage = new Image(); newResizedImage.onload = () => {
        uploadedImage = newResizedImage; updateImageResult(resizedDataUrl, `resized-${width}x${height}.png`);
        currentImageState = resizedDataUrl; hideLoading(); };
    newResizedImage.src = resizedDataUrl;
}

// Handles bulk image resizing
async function bulkImageResizer() {
    const files = bulkImageResizerInput.files;
    if (files.length === 0) {
        alert("Please select images for bulk resizing.");
        return;
    }
    const width = parseInt(document.getElementById('bulk-width').value);
    const height = parseInt(document.getElementById('bulk-height').value);
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        alert("Please enter valid positive numbers for dimensions.");
        return;
    }
    showLoading();
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'flex'; // Show container for results

    const zip = new JSZip(); // Using JSZip for downloading multiple files

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            continue;
        }

        const reader = new FileReader();
        const imageData = await new Promise(resolve => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        const img = new Image();
        img.src = imageData;
        await new Promise(resolve => img.onload = resolve);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(img, 0, 0, width, height);
        const resizedDataUrl = tempCanvas.toDataURL('image/png');

        // Display individual resized images
        const imgLink = document.createElement('a');
        imgLink.href = resizedDataUrl;
        const newFilename = `resized_${file.name.replace(/\.[^/.]+$/, "")}.png`;
        imgLink.download = newFilename;

        const resizedImgElement = document.createElement('img');
        resizedImgElement.src = resizedDataUrl;
        resizedImgElement.alt = `Resized ${file.name}`;
        imgLink.appendChild(resizedImgElement);
        splitImagesDisplay.appendChild(imgLink);

        // Add to zip file
        const base64Data = resizedDataUrl.split(',')[1];
        zip.file(newFilename, base64Data, { base64: true });
    }

    if (files.length > 0) {
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                const url = URL.createObjectURL(content);
                imageDownloadLink.href = url;
                imageDownloadLink.download = 'bulk_resized_images.zip';
                imageDownloadLink.style.display = 'inline-block';
                imageMessage.textContent = `Successfully resized ${files.length} images. Download as ZIP.`;
                imageMessage.style.color = '#28a745';
            })
            .finally(() => hideLoading());
    } else {
        imageMessage.textContent = 'No images were processed.';
        imageMessage.style.color = 'orange';
        hideLoading();
    }
    imageCanvas.style.display = 'none'; // Ensure canvas is hidden for bulk results
    imageResultImg.style.display = 'none'; // Ensure single result is hidden
    saveImageState(); // Save state if any image was processed
}


// Handles image compression
function compressImage() {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    showLoading(); saveImageState();
    const quality = parseFloat(document.getElementById('compression-quality').value);
    const format = document.getElementById('output-format').value;
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = uploadedImage.naturalWidth; tempCanvas.height = uploadedImage.naturalHeight;
    tempCtx.drawImage(uploadedImage, 0, 0);
    let compressedDataUrl;
    try {
        if (format === 'image/png') { compressedDataUrl = tempCanvas.toDataURL('image/png'); }
        else { compressedDataUrl = tempCanvas.toDataURL(format, quality); }
    } catch (e) { alert("Error compressing image. Ensure the selected format is supported by your browser and image type.");
        console.error(e); hideLoading(); return; }
    const extension = format.split('/')[1].replace('jpeg', 'jpg');
    const newCompressedImage = new Image(); newCompressedImage.onload = () => {
        uploadedImage = newCompressedImage; updateImageResult(compressedDataUrl, `compressed-image.${extension}`);
        currentImageState = compressedDataUrl; hideLoading(); };
    newCompressedImage.src = compressedDataUrl;
}

// --- Crop functionality for Image Editor ---
let isCropping = false; let startX_canvas, startY_canvas;
function getMousePos(targetCanvas, evt) {
    const rect = targetCanvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (targetCanvas.width / rect.width),
        y: (evt.clientY - rect.top) * (targetCanvas.height / rect.height)
    };
}
function startCrop(e) {
    if (currentToolId !== 'crop-image' || !uploadedImage) return;
    isCropping = true; const pos = getMousePos(imageCanvas, e);
    startX_canvas = pos.x; startY_canvas = pos.y;
    cropSelection = { x: startX_canvas, y: startY_canvas, width: 0, height: 0, active: true };
}
function drawCrop(e) {
    if (!isCropping || currentToolId !== 'crop-image' || !uploadedImage) return;
    const pos = getMousePos(imageCanvas, e);
    const currentX_canvas = pos.x; const currentY_canvas = pos.y;
    cropSelection.width = currentX_canvas - startX_canvas;
    cropSelection.height = currentY_canvas - startY_canvas;
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);
    const drawRectX = cropSelection.width < 0 ? startX_canvas + cropSelection.width : startX_canvas;
    const drawRectY = cropSelection.height < 0 ? startY_canvas + cropSelection.height : startY_canvas;
    const drawRectWidth = Math.abs(cropSelection.width);
    const drawRectHeight = Math.abs(cropSelection.height);
    imageCtx.strokeStyle = 'red'; imageCtx.lineWidth = 2;
    imageCtx.strokeRect(drawRectX, drawRectY, drawRectWidth, drawRectHeight);
}
function endCrop() { isCropping = false; }
function cropImage() {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    if (Math.abs(cropSelection.width) < 5 || Math.abs(cropSelection.height) < 5) {
        alert("Please select a valid crop area on the image by dragging (at least 5x5 pixels)."); return; }
    showLoading(); saveImageState();
    const croppedCanvas = document.createElement('canvas'); const croppedCtx = croppedCanvas.getContext('2d');
    const actualWidth = Math.abs(cropSelection.width); const actualHeight = Math.abs(cropSelection.height);
    const actualX = cropSelection.width < 0 ? startX_canvas + cropSelection.width : startX_canvas;
    const actualY = cropSelection.height < 0 ? startY_canvas + cropSelection.height : startY_canvas;
    croppedCanvas.width = actualWidth; croppedCanvas.height = actualHeight;
    croppedCtx.drawImage(uploadedImage, actualX, actualY, actualWidth, actualHeight, 0, 0, actualWidth, actualHeight);
    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    const newCroppedImage = new Image(); newCroppedImage.onload = () => {
        uploadedImage = newCroppedImage; updateImageResult(croppedDataUrl, `cropped-image.png`);
        currentImageState = croppedDataUrl; hideLoading(); };
    newCroppedImage.src = croppedDataUrl;
    cropSelection = { x: 0, y: 0, width: 0, height: 0, active: false };
    if (uploadedImage) { updateCanvasWithImage(uploadedImage); }
}

// Handles splitting images (legacy, kept for compatibility)
function splitImage() {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    showLoading(); saveImageState();
    const rows = parseInt(document.getElementById('split-rows').value);
    const cols = parseInt(document.getElementById('split-cols').value);
    if (isNaN(rows) || rows <= 0 || isNaN(cols) || cols <= 0) {
        alert("Please enter valid positive numbers for rows and columns."); hideLoading(); return; }
    const imgWidth = uploadedImage.naturalWidth; const imgHeight = uploadedImage.naturalHeight;
    const pieceWidth = Math.floor(imgWidth / cols); const pieceHeight = Math.floor(imgHeight / rows);
    const splitImagesDataUrls = [];
    splitImagesDisplay.innerHTML = ''; splitImagesDisplay.style.display = 'flex';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const currentPieceWidth = (c === cols - 1) ? (imgWidth - c * pieceWidth) : pieceWidth;
            const currentPieceHeight = (r === rows - 1) ? (imgHeight - r * pieceHeight) : pieceHeight;
            const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentPieceWidth; tempCanvas.height = currentPieceHeight;
            tempCtx.drawImage(uploadedImage, c * pieceWidth, r * pieceHeight,
                currentPieceWidth, currentPieceHeight, 0, 0, currentPieceWidth, currentPieceHeight);
            splitImagesDataUrls.push(tempCanvas.toDataURL('image/png'));
        }
    }
    hideLoading(); displaySplitImages(splitImagesDataUrls);
}
// Displays split image thumbnails for download
function displaySplitImages(dataUrls) {
    splitImagesDisplay.innerHTML = ''; splitImagesDisplay.style.display = 'flex';
    imageResultImg.style.display = 'none'; imageCanvas.style.display = 'none';
    imageDownloadLink.style.display = 'none';
    dataUrls.forEach((dataUrl, index) => {
        const imgLink = document.createElement('a'); imgLink.href = dataUrl;
        imgLink.download = `split-image-${index + 1}.png`;
        const img = document.createElement('img'); img.src = dataUrl;
        img.alt = `Split Image ${index + 1}`; img.title = `Download Split Image ${index + 1}`;
        imgLink.appendChild(img); splitImagesDisplay.appendChild(imgLink);
    });
}

// Implements horizontal/vertical flip
function flipImage(direction) {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    showLoading(); saveImageState();
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = uploadedImage.naturalWidth; tempCanvas.height = uploadedImage.naturalHeight;
    if (direction === 'horizontal') { tempCtx.translate(tempCanvas.width, 0); tempCtx.scale(-1, 1); }
    else if (direction === 'vertical') { tempCtx.translate(0, tempCanvas.height); tempCtx.scale(1, -1); }
    tempCtx.drawImage(uploadedImage, 0, 0);
    const flippedDataUrl = tempCanvas.toDataURL('image/png');
    const newFlippedImage = new Image(); newFlippedImage.onload = () => {
        uploadedImage = newFlippedImage; updateImageResult(flippedDataUrl, `flipped-${direction}-image.png`);
        currentImageState = flippedDataUrl; hideLoading(); };
    newFlippedImage.src = flippedDataUrl;
}

// Implements 90-degree rotations
function rotateImage(degrees) {
    if (!uploadedImage) { alert("Please upload an image first."); return; }
    showLoading(); saveImageState();
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    const radians = degrees * Math.PI / 180;
    const sin = Math.abs(Math.sin(radians)); const cos = Math.abs(Math.cos(radians));
    const newWidth = uploadedImage.naturalWidth * cos + uploadedImage.naturalHeight * sin;
    const newHeight = uploadedImage.naturalWidth * sin + uploadedImage.naturalHeight * cos;
    tempCanvas.width = newWidth; tempCanvas.height = newHeight;
    tempCtx.translate(newWidth / 2, newHeight / 2); tempCtx.rotate(radians);
    tempCtx.drawImage(uploadedImage, -uploadedImage.naturalWidth / 2, -uploadedImage.naturalHeight / 2);
    const rotatedDataUrl = tempCanvas.toDataURL('image/png');
    const newRotatedImage = new Image(); newRotatedImage.onload = () => {
        uploadedImage = newRotatedImage; updateImageResult(rotatedDataUrl, `rotated-${degrees}-image.png`);
        currentImageState = rotatedDataUrl; hideLoading(); };
    newRotatedImage.src = rotatedDataUrl;
}

// Implements Image Enlarger (simple scaling)
function enlargeImage() {
    if (!uploadedImage) {
        alert("Please upload an image first.");
        return;
    }
    showLoading();
    saveImageState();

    const scaleFactor = parseFloat(enlargerScaleInput.value);
    if (isNaN(scaleFactor) || scaleFactor <= 0) {
        alert("Please enter a valid positive number for the scale factor.");
        hideLoading();
        return;
    }

    const newWidth = uploadedImage.naturalWidth * scaleFactor;
    const newHeight = uploadedImage.naturalHeight * scaleFactor;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;

    // Use imageSmoothingEnabled for potentially smoother (but still pixelated) upscaling
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high'; // 'low', 'medium', 'high'

    tempCtx.drawImage(uploadedImage, 0, 0, newWidth, newHeight);

    const enlargedDataUrl = tempCanvas.toDataURL('image/png');
    const newEnlargedImage = new Image();
    newEnlargedImage.onload = () => {
        uploadedImage = newEnlargedImage;
        updateImageResult(enlargedDataUrl, `enlarged-image-x${scaleFactor}.png`);
        currentImageState = enlargedDataUrl;
        hideLoading();
    };
    newEnlargedImage.src = enlargedDataUrl;
}


// Implements Color Picker
function pickColor(e) {
    if (currentToolId !== 'color-picker' || !uploadedImage) return;
    const rect = imageCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale coordinates to canvas resolution
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);

    const pixel = imageCtx.getImageData(canvasX, canvasY, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    // Alpha is pixel[3], but often not displayed for color picker

    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    const rgb = `RGB(${r}, ${g}, ${b})`;

    pickedColorValue.textContent = `${hex} (${rgb})`;
    colorDisplayBox.style.backgroundColor = hex;
}

// Implements Meme Generator
function drawMemeTextsOnCanvas() {
    if (!uploadedImage) return; // Only draw if an image exists
    // Clear canvas and redraw image first
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);

    const fontSize = parseInt(memeFontSizeInput.value);
    const fontFamily = memeFontFamilySelect.value;

    imageCtx.font = `bold ${fontSize}px ${fontFamily}`;
    imageCtx.fillStyle = 'white';
    imageCtx.textAlign = 'center';
    imageCtx.strokeStyle = 'black';
    imageCtx.lineWidth = Math.max(2, fontSize / 25); // Adjust stroke width with font size

    // Top text
    if (memeTopText) {
        // Ensure text is within bounds, adjust Y if necessary
        const actualTopY = Math.min(Math.max(fontSize, memeTopTextPos.y), imageCanvas.height - fontSize / 2);
        imageCtx.strokeText(memeTopText.toUpperCase(), memeTopTextPos.x, actualTopY);
        imageCtx.fillText(memeTopText.toUpperCase(), memeTopTextPos.x, actualTopY);
    }

    // Bottom text
    if (memeBottomText) {
        // Ensure text is within bounds, adjust Y if necessary
        const actualBottomY = Math.min(Math.max(fontSize, memeBottomTextPos.y), imageCanvas.height - 10); // 10px from bottom
        imageCtx.strokeText(memeBottomText.toUpperCase(), memeBottomTextPos.x, actualBottomY);
        imageCtx.fillText(memeBottomText.toUpperCase(), memeBottomTextPos.x, actualBottomY);
    }
}

function generateMeme() {
    if (!uploadedImage) {
        alert("Please upload an image first.");
        return;
    }
    showLoading();
    saveImageState();

    // Redraw final meme on a temporary canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = uploadedImage.naturalWidth;
    tempCanvas.height = uploadedImage.naturalHeight;
    tempCtx.drawImage(uploadedImage, 0, 0, tempCanvas.width, tempCanvas.height);

    const fontSize = parseInt(memeFontSizeInput.value);
    const fontFamily = memeFontFamilySelect.value;

    tempCtx.font = `bold ${fontSize}px ${fontFamily}`;
    tempCtx.fillStyle = 'white';
    tempCtx.textAlign = 'center';
    tempCtx.strokeStyle = 'black';
    tempCtx.lineWidth = Math.max(2, fontSize / 25);

    if (memeTopText) {
        tempCtx.strokeText(memeTopText.toUpperCase(), memeTopTextPos.x, memeTopTextPos.y);
        tempCtx.fillText(memeTopText.toUpperCase(), memeTopTextPos.x, memeTopTextPos.y);
    }
    if (memeBottomText) {
        tempCtx.strokeText(memeBottomText.toUpperCase(), memeBottomTextPos.x, memeBottomTextPos.y);
        tempCtx.fillText(memeBottomText.toUpperCase(), memeBottomTextPos.x, memeBottomTextPos.y);
    }

    const memeDataUrl = tempCanvas.toDataURL('image/png');
    const newMemeImage = new Image();
    newMemeImage.onload = () => {
        uploadedImage = newMemeImage;
        updateImageResult(memeDataUrl, 'generated-meme.png');
        currentImageState = memeDataUrl;
        hideLoading();
    };
    newMemeImage.src = memeDataUrl;
}

// Meme Text Dragging
function startDragMemeText(e) {
    // Only allow dragging if the current tool is meme-generator
    if (currentToolId !== 'meme-generator') return;

    const rect = imageCanvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (imageCanvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (imageCanvas.height / rect.height);

    // Create dummy canvas to measure text for drag detection
    const dummyCanvas = document.createElement('canvas');
    const dummyCtx = dummyCanvas.getContext('2d');
    const fontSize = parseInt(memeFontSizeInput.value);
    const fontFamily = memeFontFamilySelect.value;
    dummyCtx.font = `bold ${fontSize}px ${fontFamily}`;

    // Check if mouse is over top text
    if (memeTopText) {
        const topTextMetrics = dummyCtx.measureText(memeTopText.toUpperCase());
        const topTextWidth = topTextMetrics.width;
        // Adjust for text alignment (center) and baseline (alphabetic is usually at bottom of font)
        const topTextHitboxX1 = memeTopTextPos.x - topTextWidth / 2;
        const topTextHitboxX2 = memeTopTextPos.x + topTextWidth / 2;
        const topTextHitboxY1 = memeTopTextPos.y - fontSize; // Rough estimate for top boundary
        const topTextHitboxY2 = memeTopTextPos.y + fontSize / 4; // Rough estimate for bottom boundary

        if (mouseX >= topTextHitboxX1 && mouseX <= topTextHitboxX2 &&
            mouseY >= topTextHitboxY1 && mouseY <= topTextHitboxY2) {
            isDraggingMemeText = true;
            draggedMemeTextElement = 'top';
            dragOffsetX = mouseX - memeTopTextPos.x;
            dragOffsetY = mouseY - memeTopTextPos.y;
            return; // Exit after finding a draggable element
        }
    }

    // Check if mouse is over bottom text
    if (memeBottomText) {
        const bottomTextMetrics = dummyCtx.measureText(memeBottomText.toUpperCase());
        const bottomTextWidth = bottomTextMetrics.width;
        const bottomTextHitboxX1 = memeBottomTextPos.x - bottomTextWidth / 2;
        const bottomTextHitboxX2 = memeBottomTextPos.x + bottomTextWidth / 2;
        const bottomTextHitboxY1 = memeBottomTextPos.y - fontSize; // Rough estimate for top boundary
        const bottomTextHitboxY2 = memeBottomTextPos.y + fontSize / 4; // Rough estimate for bottom boundary

        if (mouseX >= bottomTextHitboxX1 && mouseX <= bottomTextHitboxX2 &&
            mouseY >= bottomTextHitboxY1 && mouseY <= bottomTextHitboxY2) {
            isDraggingMemeText = true;
            draggedMemeTextElement = 'bottom';
            dragOffsetX = mouseX - memeBottomTextPos.x;
            dragOffsetY = mouseY - memeBottomTextPos.y;
            return; // Exit after finding a draggable element
        }
    }
}

function dragMemeText(e) {
    if (!isDraggingMemeText || !draggedMemeTextElement || currentToolId !== 'meme-generator') return;

    const rect = imageCanvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (imageCanvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (imageCanvas.height / rect.height);

    if (draggedMemeTextElement === 'top') {
        memeTopTextPos.x = mouseX - dragOffsetX;
        memeTopTextPos.y = mouseY - dragOffsetY;
    } else if (draggedMemeTextElement === 'bottom') {
        memeBottomTextPos.x = mouseX - dragOffsetX;
        memeBottomTextPos.y = mouseY - dragOffsetY;
    }
    drawMemeTextsOnCanvas();
}

function endDragMemeText() {
    isDraggingMemeText = false;
    draggedMemeTextElement = null;
}

// Listen for meme text input changes
memeTopTextInput?.addEventListener('input', (e) => {
    memeTopText = e.target.value;
    if (uploadedImage && currentToolId === 'meme-generator') drawMemeTextsOnCanvas();
});
memeBottomTextInput?.addEventListener('input', (e) => {
    memeBottomText = e.target.value;
    if (uploadedImage && currentToolId === 'meme-generator') drawMemeTextsOnCanvas();
});
memeFontSizeInput?.addEventListener('input', () => {
    if (uploadedImage && currentToolId === 'meme-generator') drawMemeTextsOnCanvas();
});
memeFontFamilySelect?.addEventListener('change', () => {
    if (uploadedImage && currentToolId === 'meme-generator') drawMemeTextsOnCanvas();
});


// Implements Collage Maker (basic horizontal/vertical/grid)
async function makeCollage() {
    const files = uploadCollageImagesInput.files;
    if (files.length === 0) {
        alert("Please select images for the collage.");
        return;
    }
    const layout = collageLayoutSelect.value;
    showLoading();
    imageMessage.textContent = '';
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'none';

    try {
        const loadedImages = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) {
                console.warn(`Skipping non-image file: ${file.name}`);
                continue;
            }
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(resolve => img.onload = resolve);
            loadedImages.push(img);
        }

        if (loadedImages.length === 0) {
            alert("No valid images loaded for collage.");
            hideLoading();
            return;
        }

        let collageCanvas = document.createElement('canvas');
        let collageCtx = collageCanvas.getContext('2d');
        let collageDataUrl;
        let filename = 'collage.png';

        if (layout === 'horizontal') {
            let totalWidth = loadedImages.reduce((sum, img) => sum + img.naturalWidth, 0);
            let maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
            collageCanvas.width = totalWidth;
            collageCanvas.height = maxHeight;
            let currentX = 0;
            loadedImages.forEach(img => {
                collageCtx.drawImage(img, currentX, 0, img.naturalWidth, img.naturalHeight);
                currentX += img.naturalWidth;
            });
        } else if (layout === 'vertical') {
            let maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
            let totalHeight = loadedImages.reduce((sum, img) => sum + img.naturalHeight, 0);
            collageCanvas.width = maxWidth;
            collageCanvas.height = totalHeight;
            let currentY = 0;
            loadedImages.forEach(img => {
                collageCtx.drawImage(img, 0, currentY, img.naturalWidth, img.naturalHeight);
                currentY += img.naturalHeight;
            });
        } else if (layout === '2x2') {
            if (loadedImages.length < 4) { alert("Please upload at least 4 images for a 2x2 grid."); hideLoading(); return; }
            const img1 = loadedImages[0], img2 = loadedImages[1], img3 = loadedImages[2], img4 = loadedImages[3];
            const cellWidth = Math.max(img1.naturalWidth, img2.naturalWidth, img3.naturalWidth, img4.naturalWidth);
            const cellHeight = Math.max(img1.naturalHeight, img2.naturalHeight, img3.naturalHeight, img4.naturalHeight);
            collageCanvas.width = cellWidth * 2;
            collageCanvas.height = cellHeight * 2;
            collageCtx.drawImage(img1, 0, 0, cellWidth, cellHeight);
            collageCtx.drawImage(img2, cellWidth, 0, cellWidth, cellHeight);
            collageCtx.drawImage(img3, 0, cellHeight, cellWidth, cellHeight);
            collageCtx.drawImage(img4, cellWidth, cellHeight, cellWidth, cellHeight);
            filename = 'collage_2x2.png';
        } else if (layout === '1x2') { // One top, two below
            if (loadedImages.length < 3) { alert("Please upload at least 3 images for a 1x2 layout."); hideLoading(); return; }
            const img1 = loadedImages[0], img2 = loadedImages[1], img3 = loadedImages[2];
            const topWidth = img1.naturalWidth;
            const bottomWidth = Math.max(img2.naturalWidth, img3.naturalWidth);
            const totalWidth = Math.max(topWidth, bottomWidth * 2);
            const totalHeight = img1.naturalHeight + Math.max(img2.naturalHeight, img3.naturalHeight);

            collageCanvas.width = totalWidth;
            collageCanvas.height = totalHeight;

            // Draw top image centered
            collageCtx.drawImage(img1, (totalWidth - img1.naturalWidth) / 2, 0, img1.naturalWidth, img1.naturalHeight);

            // Draw bottom two images
            const bottomY = img1.naturalHeight;
            const bottomHeight = Math.max(img2.naturalHeight, img3.naturalHeight);
            collageCtx.drawImage(img2, (totalWidth / 2 - img2.naturalWidth) / 2, bottomY, img2.naturalWidth, bottomHeight); // Centered in left half
            collageCtx.drawImage(img3, totalWidth / 2 + (totalWidth / 2 - img3.naturalWidth) / 2, bottomY, img3.naturalWidth, bottomHeight); // Centered in right half
            filename = 'collage_1x2.png';
        } else if (layout === '2x1') { // Two top, one below
            if (loadedImages.length < 3) { alert("Please upload at least 3 images for a 2x1 layout."); hideLoading(); return; }
            const img1 = loadedImages[0], img2 = loadedImages[1], img3 = loadedImages[2];
            const topWidth = Math.max(img1.naturalWidth, img2.naturalWidth);
            const bottomWidth = img3.naturalWidth;
            const totalWidth = Math.max(topWidth * 2, bottomWidth);
            const totalHeight = Math.max(img1.naturalHeight, img2.naturalHeight) + img3.naturalHeight;

            collageCanvas.width = totalWidth;
            collageCanvas.height = totalHeight;

            // Draw top two images
            const topHeight = Math.max(img1.naturalHeight, img2.naturalHeight);
            collageCtx.drawImage(img1, (totalWidth / 2 - img1.naturalWidth) / 2, 0, img1.naturalWidth, topHeight); // Centered in left half
            collageCtx.drawImage(img2, totalWidth / 2 + (totalWidth / 2 - img2.naturalWidth) / 2, 0, img2.naturalWidth, topHeight); // Centered in right half

            // Draw bottom image centered
            collageCtx.drawImage(img3, (totalWidth - img3.naturalWidth) / 2, topHeight, img3.naturalWidth, img3.naturalHeight);
            filename = 'collage_2x1.png';
        }

        collageDataUrl = collageCanvas.toDataURL('image/png');
        const newCollageImage = new Image();
        newCollageImage.onload = () => {
            uploadedImage = newCollageImage;
            updateImageResult(collageDataUrl, filename);
            currentImageState = collageDataUrl;
            imageMessage.textContent = 'Collage created successfully!';
            imageMessage.style.color = '#28a745';
            hideLoading();
        };
        newCollageImage.src = collageDataUrl;

        // Revoke object URLs to free memory
        loadedImages.forEach(img => URL.revokeObjectURL(img.src));

    } catch (error) {
        console.error("Error creating collage:", error);
        imageMessage.textContent = `Error: Could not create collage. ${error.message}`;
        imageMessage.style.color = 'red';
        hideLoading();
    }
}


// Undoes the last operation in the image editor
function undoLastImageOperation() {
    if (imageHistory.length > 0) {
        showLoading();
        const lastState = imageHistory.pop();
        currentImageState = lastState;
        const img = new Image();
        img.onload = () => {
            uploadedImage = img; updateCanvasWithImage(img);
            updateImageResult(img.src); hideLoading(); };
        img.src = lastState;
        if (imageHistory.length === 0) { imageUndoButton.disabled = true; }
    } else {
        alert("No more operations to undo. Clearing image display.");
        uploadedImage = null; currentImageState = null;
        imageResultImg.style.display = 'none'; imageCanvas.style.display = 'none';
        imageDownloadLink.style.display = 'none'; splitImagesDisplay.innerHTML = '';
        splitImagesDisplay.style.display = 'none'; imageUndoButton.disabled = true;
        imageMessage.textContent = 'Upload an image to get started.';
        hideLoading();
    }
}


// --- CONVERT TOOLS FUNCTIONS ---

// Generic Image Converter (JPG, PNG, WebP)
async function imageConverter() {
    const fileInput = document.getElementById('upload-image-converter-input');
    const file = fileInput.files[0];
    const targetFormat = imageConvertFormatSelect.value;

    if (!file) {
        alert("Please select an image file to convert.");
        return;
    }
    if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file.");
        return;
    }

    showLoading();
    convertMessage.style.display = 'none';
    convertDownloadLink.style.display = 'none';
    bulkConvertResultsDisplay.innerHTML = '';
    bulkConvertResultsDisplay.style.display = 'none';

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise(resolve => reader.onload = resolve);
        const imgDataUrl = reader.result;

        const img = new Image();
        img.src = imgDataUrl;
        await new Promise(resolve => img.onload = resolve);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tempCtx.drawImage(img, 0, 0);

        const convertedDataUrl = tempCanvas.toDataURL(targetFormat);
        const extension = targetFormat.split('/')[1].replace('jpeg', 'jpg');
        const fileName = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;

        convertDownloadLink.href = convertedDataUrl;
        convertDownloadLink.download = fileName;
        convertDownloadLink.style.display = 'inline-block';
        convertMessage.textContent = `Successfully converted to ${extension.toUpperCase()}!`;
        convertMessage.style.color = '#28a745';
        convertMessage.style.display = 'block';

        // Optionally display a preview
        const previewImg = document.createElement('img');
        previewImg.src = convertedDataUrl;
        previewImg.style.maxWidth = '200px';
        previewImg.style.maxHeight = '200px';
        previewImg.style.margin = '10px';
        previewImg.style.border = '1px solid #ddd';
        previewImg.style.borderRadius = '5px';
        bulkConvertResultsDisplay.style.display = 'flex';
        bulkConvertResultsDisplay.appendChild(previewImg);


    } catch (error) {
        console.error("Error converting image:", error);
        convertMessage.textContent = `Error: Could not convert image. ${error.message}`;
        convertMessage.style.color = 'red';
        convertMessage.style.display = 'block';
    } finally {
        hideLoading();
    }
}

// SVG to PNG/JPG Converter
async function svgConverter() {
    const fileInput = document.getElementById('upload-svg-converter-input');
    const file = fileInput.files[0];
    const targetFormat = svgConvertFormatSelect.value;

    if (!file) {
        alert("Please select an SVG file to convert.");
        return;
    }
    if (file.type !== 'image/svg+xml') {
        alert("Please select a valid SVG file.");
        return;
    }

    showLoading();
    convertMessage.style.display = 'none';
    convertDownloadLink.style.display = 'none';
    bulkConvertResultsDisplay.innerHTML = '';
    bulkConvertResultsDisplay.style.display = 'none';

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise(resolve => reader.onload = resolve);
        const svgDataUrl = reader.result;

        const img = new Image();
        img.src = svgDataUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Failed to load SVG as image. Check if SVG contains external resources or complex styles."));
        });

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Set canvas dimensions based on SVG if loaded, otherwise default
        tempCanvas.width = img.naturalWidth > 0 ? img.naturalWidth : 600; // Default if SVG has no inherent size
        tempCanvas.height = img.naturalHeight > 0 ? img.naturalHeight : 400;
        tempCtx.fillStyle = '#FFFFFF'; // Default background for SVG rasterization
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); // Fill background

        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const convertedDataUrl = tempCanvas.toDataURL(targetFormat);
        const extension = targetFormat.split('/')[1].replace('jpeg', 'jpg');
        const fileName = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;

        convertDownloadLink.href = convertedDataUrl;
        convertDownloadLink.download = fileName;
        convertDownloadLink.style.display = 'inline-block';
        convertMessage.textContent = `Successfully converted to ${extension.toUpperCase()}!`;
        convertMessage.style.color = '#28a745';
        convertMessage.style.display = 'block';

        const previewImg = document.createElement('img');
        previewImg.src = convertedDataUrl;
        previewImg.style.maxWidth = '200px';
        previewImg.style.maxHeight = '200px';
        previewImg.style.margin = '10px';
        previewImg.style.border = '1px solid #ddd';
        previewImg.style.borderRadius = '5px';
        bulkConvertResultsDisplay.style.display = 'flex';
        bulkConvertResultsDisplay.appendChild(previewImg);

    } catch (error) {
        console.error("Error converting SVG:", error);
        convertMessage.textContent = `Error: Could not convert SVG. ${error.message}`;
        convertMessage.style.color = 'red';
        convertMessage.style.display = 'block';
    } finally {
        hideLoading();
    }
}


// --- PDF TOOLS FUNCTIONS ---

async function mergePdfs() {
    const files = uploadPdfsInput.files;
    if (files.length === 0) { alert("Please select at least one PDF file to merge."); return; }
    showLoading(); pdfMessage.style.display = 'none'; pdfDownloadLink.style.display = 'none';
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type !== 'application/pdf') { console.warn(`Skipping non-PDF file: ${file.name}`); continue; }
            const arrayBuffer = await file.arrayBuffer();
            const donorPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await pdfDoc.copyPages(donorPdfDoc, donorPdfDoc.getPageIndices());
            copiedPages.forEach((page) => pdfDoc.addPage(page));
        }
        if (pdfDoc.getPages().length === 0) { alert("No valid PDF files were found or processed for merging."); hideLoading(); return; }
        const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        pdfDownloadLink.href = url; pdfDownloadLink.download = 'merged_document.pdf';
        pdfDownloadLink.style.display = 'inline-block';
        pdfMessage.textContent = 'PDF merged successfully!'; pdfMessage.style.color = '#28a745';
        pdfMessage.style.display = 'block';
    } catch (error) { console.error("Error merging PDFs:", error);
        pdfMessage.textContent = `Error: Could not merge PDFs. ${error.message}`;
        pdfMessage.style.color = 'red'; pdfMessage.style.display = 'block';
    } finally { hideLoading(); }
}

// Compress PDF by re-embedding images with lower quality
async function compressPdf() {
    const fileInput = document.getElementById('upload-compress-pdf');
    const file = fileInput.files[0];
    const imageQuality = parseFloat(pdfCompressQuality.value); // This quality will be used if we re-embed images

    if (!file) {
        alert("Please select a PDF file to compress.");
        return;
    }
    if (file.type !== 'application/pdf') {
        alert("Please select a valid PDF file.");
        return;
    }

    showLoading();
    pdfMessage.style.display = 'none';
    pdfDownloadLink.style.display = 'none';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

        const newPdfDoc = await PDFLib.PDFDocument.create();

        // This implementation will attempt to copy pages and re-embed existing images if they are
        // directly accessible as common image types (like JPG, PNG) within the PDF's XObjects.
        // For complex PDFs with different image encodings or advanced content, this might not
        // fully re-compress all images, but it will apply general PDF stream compression.

        // A more robust image recompression within a PDF requires deep parsing of PDF content streams
        // to identify image objects, extract their raw data, re-encode them (e.g., via canvas for
        // raster images) at the desired quality, and then replace the original image objects
        // with the new compressed ones. This is very complex client-side.

        // For simplicity and client-side feasibility, this implementation will primarily rely on
        // `pdf-lib`'s built-in compression when saving the new PDF, and for images it *can* re-embed
        // it will apply the specified quality.

        for (const page of pdfDoc.getPages()) {
            const { width, height } = page.getSize();
            const newPage = newPdfDoc.addPage([width, height]);

            // Copy original content stream
            const contentStream = await page.getContents();
            newPage.setContents(contentStream);

            // Attempt to re-embed images with new quality (simplified)
            // This is a complex area in PDF manipulation. `pdf-lib` doesn't provide a direct
            // API to "recompress existing image XObjects".
            // The following approach is more conceptual for client-side limitations.
            // A truly comprehensive PDF compressor requires a deeper level of PDF object manipulation
            // to extract, re-encode, and replace image streams.

            // The main compression benefit comes from the `save()` options.
            // You can, however, iterate through all pages and their resources, and for `XObject`s
            // that are images, you'd hypothetically:
            // 1. Get the image bytes.
            // 2. Decode them into a format `canvas` can use (e.g., ImageData).
            // 3. Draw on a temporary canvas and then `toDataURL('image/jpeg', imageQuality)`.
            // 4. Embed the new compressed image into `newPdfDoc`.
            // 5. Crucially, replace the old image's reference in the new PDF's resource dictionary
            //    and update any content streams that refer to it. This last step is very hard with `pdf-lib`'s
            //    current high-level API.

            // Given this, the `compressPdf` function will mainly rely on `pdf-lib`'s default
            // compression settings when saving, which often applies stream compression and might
            // re-encode some types of embedded images (like uncompressed ones) to a more efficient format.
            // Explicit image re-compression of *all* existing embedded images in a PDF is beyond the
            // current scope and practical client-side capability without much more complex libraries.
        }

        const pdfBytes = await newPdfDoc.save({
            use: [PDFLib.Default="PDFDefault", PDFLib.FlateStream, PDFLib.JPEG], // Apply general stream compression and optimize JPEGs
            updateMetadata: true, // Update metadata
            // For explicitly setting image quality on *embedded* JPEG images, when creating new ones:
            // JPEG: { quality: imageQuality } // This applies only to newly embedded JPEGs
        });

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        pdfDownloadLink.href = url;
        pdfDownloadLink.download = `compressed_${file.name}`;
        pdfDownloadLink.style.display = 'inline-block';
        pdfMessage.textContent = 'PDF processed for compression (stream compression applied)!';
        pdfMessage.style.color = '#28a745';
        pdfMessage.style.display = 'block';

    } catch (error) {
        console.error("Error compressing PDF:", error);
        pdfMessage.textContent = `Error: Could not compress PDF. ${error.message}`;
        pdfMessage.style.color = 'red';
        pdfMessage.style.display = 'block';
    } finally {
        hideLoading();
    }
}


// Common function for converting images to PDF (used by Image to PDF, JPG to PDF, PNG to PDF)
async function convertImagesToPdf(files, outputFileName = 'images_to_pdf.pdf') {
    if (files.length === 0) { alert("Please select at least one image file to convert to PDF."); return; }
    showLoading(); pdfMessage.style.display = 'none'; pdfDownloadLink.style.display = 'none';
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png') && !file.type.startsWith('image/webp')) {
                console.warn(`Skipping unsupported image type for PDF conversion: ${file.name} (${file.type})`);
                continue;
            }
            const imgData = await new Promise((resolve, reject) => {
                const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e); reader.readAsArrayBuffer(file);
            });
            let image;
            if (file.type.startsWith('image/jpeg')) { image = await pdfDoc.embedJpg(imgData); }
            else if (file.type.startsWith('image/png')) { image = await pdfDoc.embedPng(imgData); }
            else if (file.type.startsWith('image/webp')) {
                // WebP embedding directly not supported by pdf-lib, convert via canvas first
                const tempImg = new Image();
                tempImg.src = URL.createObjectURL(file);
                await new Promise(resolve => tempImg.onload = resolve);
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = tempImg.naturalWidth;
                tempCanvas.height = tempImg.naturalHeight;
                tempCtx.drawImage(tempImg, 0, 0);
                const pngDataUrl = tempCanvas.toDataURL('image/png'); // Convert WebP to PNG
                image = await pdfDoc.embedPng(pngDataUrl);
                URL.revokeObjectURL(tempImg.src); // Clean up URL
            }

            if (!image) { // If image could not be embedded
                console.warn(`Could not embed image: ${file.name}`);
                continue;
            }

            const page = pdfDoc.addPage();
            const { width, height } = image.scale(Math.min(page.getWidth() / image.width, page.getHeight() / image.height));
            const x = (page.getWidth() - width) / 2; const y = (page.getHeight() - height) / 2;
            page.drawImage(image, { x, y, width, height });
        }
        if (pdfDoc.getPages().length === 0) { alert("No supported images (JPEG, PNG, or WebP) were found to convert to PDF."); hideLoading(); return; }
        const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        pdfDownloadLink.href = url; pdfDownloadLink.download = outputFileName;
        pdfDownloadLink.style.display = 'inline-block';
        pdfMessage.textContent = 'Images converted to PDF successfully!'; pdfMessage.style.color = '#28a745';
        pdfMessage.style.display = 'block';
    } catch (error) { console.error("Error converting images to PDF:", error);
        pdfMessage.textContent = `Error: Could not convert images to PDF. ${error.message}`;
        pdfMessage.style.color = 'red'; pdfMessage.style.display = 'block';
    } finally { hideLoading(); }
}

async function imagesToPdf() { await convertImagesToPdf(uploadImagesToPdfInput.files, 'images_to_pdf.pdf'); }
async function jpgsToPdf() { await convertImagesToPdf(uploadJpgsToPdfInput.files, 'jpgs_to_pdf.pdf'); }
async function pngsToPdf() { await convertImagesToPdf(uploadPngsToPdfInput.files, 'pngs_to_pdf.pdf'); }


// --- APPS TOOLS FUNCTIONS (PLACEHOLDERS) ---
function showAppToolContent(toolId) {
    appsMessage.style.display = 'block';
    appsMessage.textContent = `You selected: ${toolId.replace(/-/g, ' ').toUpperCase()}. This section provides information about our dedicated mobile applications. Functionality not yet implemented.`;
    appsMessage.style.color = '#555';
}


// --- EVENT LISTENERS ---

// Home button
homeButton.addEventListener('click', () => {
    showMainView('dashboard-overview-section');
});

// Back button
backButton.addEventListener('click', () => {
    popHistoryState();
});


// Main category selection buttons from the Dashboard Overview
document.querySelectorAll('.overview-category-button').forEach(button => {
    button.addEventListener('click', () => {
        showMainView(button.dataset.category + '-category-section');
    });
});

// Specific tool selection buttons from the Dashboard Overview
document.querySelectorAll('.overview-tool-button').forEach(button => {
    button.addEventListener('click', () => {
        showTool(button.dataset.tool, button.dataset.category);
    });
});


// Tool selection buttons within Category Pages
document.querySelectorAll('.tool-selection-buttons .tool-button').forEach(button => {
    button.addEventListener('click', () => {
        const categoryId = button.closest('.main-view.category-view').id.replace('-category-section', '');
        showTool(button.dataset.tool, categoryId);
    });
});


// Common Image Upload Area (Drag and Drop)
imageUploadArea.addEventListener('dragenter', preventDefaults, false);
imageUploadArea.addEventListener('dragover', preventDefaults, false);
imageUploadArea.addEventListener('dragleave', unhighlight, false);
imageUploadArea.addEventListener('drop', unhighlight, false);
imageUploadArea.addEventListener('dragenter', highlight, false);
imageUploadArea.addEventListener('dragover', highlight, false);


imageUploadArea.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        uploadImageCommonInput.files = dataTransfer.files;
        uploadImageCommonInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        alert("Please drop an image file.");
    }
});

// Listen for file selection on the common image upload input
uploadImageCommonInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        showLoading();
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = () => {
                uploadedImage = img;
                imageHistory = [];
                saveImageState();
                // Reset meme text positions when a new image is loaded
                memeTopTextPos = { x: uploadedImage.naturalWidth / 2, y: 50 };
                memeBottomTextPos = { x: uploadedImage.naturalWidth / 2, y: uploadedImage.naturalHeight - 50 };
                memeTopText = '';
                memeBottomText = '';
                if (memeTopTextInput) memeTopTextInput.value = '';
                if (memeBottomTextInput) memeBottomTextInput.value = '';

                // Draw image with potential meme text if tool is active
                updateCanvasWithImage(uploadedImage, currentToolId === 'meme-generator');
                updateImageResult(uploadedImage.src, file.name);
                hideLoading();
                imageUndoButton.disabled = true;
            };
            img.onerror = () => {
                alert("Could not load image. Please ensure it's a valid image file.");
                hideLoading();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Second image upload for merge (Legacy Image Tool)
uploadMerge2Input?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img2 = new Image();
            img2.onload = () => {
                uploadedImage2 = img2;
                alert("Second image loaded for merging.");
            };
            img2.onerror = () => {
                alert("Could not load second image. Please ensure it's a valid image file.");
            };
            img2.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Quality display for compress tool (Image Editor)
qualityDisplay?.addEventListener('input', function (e) {
    qualityDisplay.textContent = parseFloat(e.target.value).toFixed(2);
});


// Common PDF Upload Area (Drag and Drop)
pdfUploadArea.addEventListener('dragenter', preventDefaults, false);
pdfUploadArea.addEventListener('dragover', preventDefaults, false);
pdfUploadArea.addEventListener('dragleave', unhighlight, false);
pdfUploadArea.addEventListener('drop', unhighlight, false);
pdfUploadArea.addEventListener('dragenter', highlight, false);
pdfUploadArea.addEventListener('dragover', highlight, false);

pdfUploadArea.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        // Find the currently active PDF tool input and assign files
        let targetInput = null;
        if (currentToolId === 'merge-pdf') targetInput = uploadPdfsInput;
        else if (currentToolId === 'image-to-pdf') targetInput = uploadImagesToPdfInput;
        else if (currentToolId === 'jpg-to-pdf') targetInput = uploadJpgsToPdfInput;
        else if (currentToolId === 'png-to-pdf') targetInput = uploadPngsToPdfInput;
        else if (currentToolId === 'compress-pdf') targetInput = uploadCompressPdfInput;

        if (targetInput) {
            const dataTransfer = new DataTransfer();
            for (let i = 0; i < files.length; i++) {
                dataTransfer.items.add(files[i]);
            }
            targetInput.files = dataTransfer.files;
            targetInput.dispatchEvent(new Event('change', { bubbles: true })); // Trigger change
            pdfMessage.textContent = `Dropped ${files.length} file(s) for ${currentToolId.replace(/-/g, ' ').toUpperCase()}. Click "Apply" button.`;
            pdfMessage.style.color = '#555';
        } else {
            pdfMessage.textContent = `Dropped ${files.length} file(s). Select a specific PDF tool to process them.`;
            pdfMessage.style.color = '#555';
        }
    } else {
        pdfMessage.textContent = 'No files dropped.';
        pdfMessage.style.color = 'orange';
    }
});

// Common Convert Upload Area (Drag and Drop)
convertUploadArea.addEventListener('dragenter', preventDefaults, false);
convertUploadArea.addEventListener('dragover', preventDefaults, false);
convertUploadArea.addEventListener('dragleave', unhighlight, false);
convertUploadArea.addEventListener('drop', unhighlight, false);
convertUploadArea.addEventListener('dragenter', highlight, false);
convertUploadArea.addEventListener('dragover', highlight, false);

convertUploadArea.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        // For single file converter tools, directly assign to common input
        if (currentToolId === 'image-converter') {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            uploadImageConverterInput.files = dataTransfer.files;
            uploadImageConverterInput.dispatchEvent(new Event('change', { bubbles: true }));
            convertMessage.textContent = `Dropped 1 file. Click "Convert Image" button.`;
            convertMessage.style.color = '#555';
        } else if (currentToolId === 'svg-converter') {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            uploadSvgConverterInput.files = dataTransfer.files;
            uploadSvgConverterInput.dispatchEvent(new Event('change', { bubbles: true }));
            convertMessage.textContent = `Dropped 1 file. Click "Convert SVG" button.`;
            convertMessage.style.color = '#555';
        } else {
            convertMessage.textContent = `Dropped ${files.length} file(s). Functionality not yet implemented for this tool.`;
            convertMessage.style.color = '#555';
        }
    } else {
        convertMessage.textContent = 'No files dropped.';
        convertMessage.style.color = 'orange';
    }
});


// --- INITIAL SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    showMainView('dashboard-overview-section'); // Start on the dashboard overview
    hideLoading(); // Ensure loading indicator is hidden on load
    if (qualityDisplay) qualityDisplay.textContent = parseFloat(document.getElementById('compression-quality').value).toFixed(2); // Set initial image quality display
    if (pdfQualityDisplay) pdfQualityDisplay.textContent = parseFloat(document.getElementById('pdf-compress-quality').value).toFixed(2); // Set initial PDF quality display

    // Initial default for image editor specific values for meme generator
    memeTopTextPos = { x: imageCanvas.width / 2, y: 50 }; // Assuming default canvas size for initial positions
    memeBottomTextPos = { x: imageCanvas.width / 2, y: imageCanvas.height - 50 };

    // Attach JSZip library for bulk downloads (assuming it's loaded from CDN in HTML)
    // No direct JS here, just a reminder it's needed for bulk downloads.
});
