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
    'video-tools': document.getElementById('video-tools-category-section'), // NEW VIDEO CATEGORY
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

// Convert Any File to Image elements
const uploadFileToImageInput = document.getElementById('upload-file-to-image');
const detectedFileTypeSpan = document.getElementById('detected-file-type');
const conversionStatusSpan = document.getElementById('conversion-status');
const targetImageFormatSelect = document.getElementById('target-image-format');
const convertFileToImageButton = document.getElementById('convert-file-to-image-button');

// Logo Design elements
const logoDescriptionInput = document.getElementById('logo-description');
const logoDesignFilenameInput = document.getElementById('logo-design-filename');


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

// PDF to JPG specific elements
const uploadPdfToJpgInput = document.getElementById('upload-pdf-to-jpg');


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

// --- DOM Elements - Video Tools --- // NEW VIDEO TOOL ELEMENTS
const videoUploadArea = document.getElementById('video-upload-area');
const uploadVideoCommonInput = document.getElementById('upload-video-common');
const videoMessage = document.getElementById('video-message');
const videoDownloadLink = document.getElementById('video-download');


// --- DOM Elements - Apps Tools ---
const appsMessage = document.getElementById('apps-message');


// --- UTILITY FUNCTIONS ---

function showLoading() { loadingIndicator.style.display = 'flex'; }
function hideLoading() { loadingIndicator.style.display = 'none'; }

// Helper to get filename from input or use default
function getDownloadFilename(inputElementId, defaultFilename, extension) {
    const input = document.getElementById(inputElementId);
    let filename = input?.value.trim();
    if (!filename) {
        filename = defaultFilename;
    }
    // Ensure filename has the correct extension if not already present
    if (extension && !filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
        filename += `.${extension.toLowerCase()}`;
    }
    return filename;
}


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
            if (['image-resizer', 'image-compressor', 'crop-image', 'flip-image', 'rotate-image', 'color-picker', 'meme-generator', 'merge-options', 'split-options', 'collage-maker', 'image-enlarger', 'convert-to-image', 'logo-design'].includes(toolId)) {
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
        } else if (toolId === 'convert-to-image') {
            // Reset convert to image status
            detectedFileTypeSpan.textContent = 'N/A';
            conversionStatusSpan.textContent = 'Please upload a file.';
            conversionStatusSpan.style.color = '#666';
            convertFileToImageButton.disabled = true;
            if (uploadFileToImageInput) uploadFileToImageInput.value = ''; // Clear file input
        } else if (toolId === 'logo-design') {
            // Clear logo description and filename inputs
            if (logoDescriptionInput) logoDescriptionInput.value = '';
            if (logoDesignFilenameInput) logoDesignFilenameInput.value = 'my-new-logo.png';
            imageMessage.textContent = 'Enter your logo idea and click "Generate Logo".';
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

    } else if (categoryId === 'video-tools') { // NEW VIDEO TOOL HANDLER
        videoUploadArea.style.display = 'flex';
        videoMessage.style.display = 'block';
        videoMessage.textContent = 'Upload a video to get started.';
        videoDownloadLink.style.display = 'none';

    } else if (categoryId === 'apps-tools') {
        appsMessage.style.display = 'block';
        appsMessage.textContent = `You selected: ${toolId.replace(/-/g, ' ').toUpperCase()}. This section provides information about our dedicated mobile applications. Functionality not yet implemented.`;
        // Hide upload areas not relevant to apps
        imageUploadArea.style.display = 'none';
        pdfUploadArea.style.display = 'none';
        convertUploadArea.style.display = 'none';
        videoUploadArea.style.display = 'none'; // Also hide video upload area for apps
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
        } else if (categoryId === 'video-tools') { // NEW VIDEO TOOL MESSAGE FOR PLACEHOLDER
            videoMessage.style.display = 'block';
            videoDownloadLink.style.display = 'none';
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

    videoMessage.style.display = 'none'; // NEW: Reset video message
    videoDownloadLink.style.display = 'none'; // NEW: Reset video download link
    videoUploadArea.style.display = 'none'; // NEW: Hide video upload area

    appsMessage.style.display = 'none'; // Hide apps message initially
}


// --- IMAGE EDITOR FUNCTIONS ---

// Handles image resizing
function resizeImage() {
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading();
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        imageMessage.textContent = "Please enter valid positive numbers for dimensions.";
        imageMessage.style.color = 'red';
        hideLoading();
        return;
    }
    saveImageState();
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width; tempCanvas.height = height;
    tempCtx.drawImage(uploadedImage, 0, 0, width, height);
    const resizedDataUrl = tempCanvas.toDataURL('image/png');
    const filename = getDownloadFilename('image-resizer-filename', 'resized-image.png', 'png');
    const newResizedImage = new Image(); newResizedImage.onload = () => {
        uploadedImage = newResizedImage; updateImageResult(resizedDataUrl, filename);
        currentImageState = resizedDataUrl; hideLoading();
        imageMessage.textContent = "Image resized successfully!";
        imageMessage.style.color = '#28a745';
    };
    newResizedImage.src = resizedDataUrl;
}

// Handles bulk image resizing
async function bulkImageResizer() {
    const files = bulkImageResizerInput.files;
    if (files.length === 0) {
        imageMessage.textContent = "Please select images for bulk resizing.";
        imageMessage.style.color = 'orange';
        return;
    }
    const width = parseInt(document.getElementById('bulk-width').value);
    const height = parseInt(document.getElementById('bulk-height').value);
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        imageMessage.textContent = "Please enter valid positive numbers for dimensions.";
        imageMessage.style.color = 'red';
        return;
    }
    showLoading();
    splitImagesDisplay.innerHTML = '';
    splitImagesDisplay.style.display = 'flex'; // Show container for results

    const zip = new JSZip(); // Using JSZip for downloading multiple files
    const zipFilename = getDownloadFilename('bulk-image-resizer-filename', 'resized_images.zip', 'zip');

    let processedCount = 0;
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
        processedCount++;
    }

    if (processedCount > 0) {
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                const url = URL.createObjectURL(content);
                imageDownloadLink.href = url;
                imageDownloadLink.download = zipFilename;
                imageDownloadLink.style.display = 'inline-block';
                imageMessage.textContent = `Successfully resized ${processedCount} images. Download as ZIP.`;
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
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
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
    } catch (e) {
        imageMessage.textContent = "Error compressing image. Ensure the selected format is supported by your browser and image type.";
        imageMessage.style.color = 'red';
        console.error(e); hideLoading(); return;
    }
    const extension = format.split('/')[1].replace('jpeg', 'jpg').replace('image/', '');
    const filename = getDownloadFilename('image-compressor-filename', `compressed-image.${extension}`, extension);
    const newCompressedImage = new Image(); newCompressedImage.onload = () => {
        uploadedImage = newCompressedImage; updateImageResult(compressedDataUrl, filename);
        currentImageState = compressedDataUrl; hideLoading();
        imageMessage.textContent = "Image compressed successfully!";
        imageMessage.style.color = '#28a745';
    };
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
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
    if (Math.abs(cropSelection.width) < 5 || Math.abs(cropSelection.height) < 5) {
        imageMessage.textContent = "Please select a valid crop area on the image by dragging (at least 5x5 pixels).";
        imageMessage.style.color = 'red';
        return;
    }
    showLoading(); saveImageState();
    const croppedCanvas = document.createElement('canvas'); const croppedCtx = croppedCanvas.getContext('2d');
    const actualWidth = Math.abs(cropSelection.width); const actualHeight = Math.abs(cropSelection.height);
    const actualX = cropSelection.width < 0 ? startX_canvas + cropSelection.width : startX_canvas;
    const actualY = cropSelection.height < 0 ? startY_canvas + cropSelection.height : startY_canvas;
    croppedCanvas.width = actualWidth; croppedCanvas.height = actualHeight;
    croppedCtx.drawImage(uploadedImage, actualX, actualY, actualWidth, actualHeight, 0, 0, actualWidth, actualHeight);
    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    const filename = getDownloadFilename('crop-image-filename', 'cropped-image.png', 'png');
    const newCroppedImage = new Image(); newCroppedImage.onload = () => {
        uploadedImage = newCroppedImage; updateImageResult(croppedDataUrl, filename);
        currentImageState = croppedDataUrl; hideLoading();
        imageMessage.textContent = "Image cropped successfully!";
        imageMessage.style.color = '#28a745';
    };
    newCroppedImage.src = croppedDataUrl;
    cropSelection = { x: 0, y: 0, width: 0, height: 0, active: false };
    if (uploadedImage) { updateCanvasWithImage(uploadedImage); }
}

// Handles splitting images (legacy, kept for compatibility)
function splitImage() {
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading(); saveImageState();
    const rows = parseInt(document.getElementById('split-rows').value);
    const cols = parseInt(document.getElementById('split-cols').value);
    if (isNaN(rows) || rows <= 0 || isNaN(cols) || cols <= 0) {
        imageMessage.textContent = "Please enter valid positive numbers for rows and columns.";
        imageMessage.style.color = 'red';
        hideLoading();
        return;
    }
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
    const zip = new JSZip();
    const zipFilename = getDownloadFilename('split-image-filename', 'split_images.zip', 'zip');

    dataUrls.forEach((dataUrl, index) => {
        const imgLink = document.createElement('a'); imgLink.href = dataUrl;
        imgLink.download = `split-image-${index + 1}.png`; // Individual download name
        const img = document.createElement('img'); img.src = dataUrl;
        img.alt = `Split Image ${index + 1}`; img.title = `Download Split Image ${index + 1}`;
        imgLink.appendChild(img); splitImagesDisplay.appendChild(imgLink);

        // Add to zip file
        const base64Data = dataUrl.split(',')[1];
        zip.file(`split-image-${index + 1}.png`, base64Data, { base64: true });
    });

    zip.generateAsync({ type: "blob" })
        .then(function (content) {
            const url = URL.createObjectURL(content);
            imageDownloadLink.href = url;
            imageDownloadLink.download = zipFilename;
            imageDownloadLink.style.display = 'inline-block';
            imageMessage.textContent = `Successfully split image into ${dataUrls.length} pieces. Download as ZIP.`;
            imageMessage.style.color = '#28a745';
        })
        .finally(() => hideLoading());
}


// Implements horizontal/vertical flip
function flipImage(direction) {
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading(); saveImageState();
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = uploadedImage.naturalWidth; tempCanvas.height = uploadedImage.naturalHeight;
    if (direction === 'horizontal') { tempCtx.translate(tempCanvas.width, 0); tempCtx.scale(-1, 1); }
    else if (direction === 'vertical') { tempCtx.translate(0, tempCanvas.height); tempCtx.scale(1, -1); }
    tempCtx.drawImage(uploadedImage, 0, 0);
    const flippedDataUrl = tempCanvas.toDataURL('image/png');
    const filename = getDownloadFilename('flip-image-filename', `flipped-${direction}-image.png`, 'png');
    const newFlippedImage = new Image(); newFlippedImage.onload = () => {
        uploadedImage = newFlippedImage; updateImageResult(flippedDataUrl, filename);
        currentImageState = flippedDataUrl; hideLoading();
        imageMessage.textContent = `Image flipped ${direction}ly successfully!`;
        imageMessage.style.color = '#28a745';
    };
    newFlippedImage.src = flippedDataUrl;
}

// Implements 90-degree rotations
function rotateImage(degrees) {
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
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
    const filename = getDownloadFilename('rotate-image-filename', `rotated-${degrees}-image.png`, 'png');
    const newRotatedImage = new Image(); newRotatedImage.onload = () => {
        uploadedImage = newRotatedImage; updateImageResult(rotatedDataUrl, filename);
        currentImageState = rotatedDataUrl; hideLoading();
        imageMessage.textContent = `Image rotated ${degrees}° successfully!`;
        imageMessage.style.color = '#28a745';
    };
    newRotatedImage.src = rotatedDataUrl;
}

// Implements Image Enlarger (simple scaling)
function enlargeImage() {
    if (!uploadedImage) {
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading();
    saveImageState();

    const scaleFactor = parseFloat(enlargerScaleInput.value);
    if (isNaN(scaleFactor) || scaleFactor <= 0) {
        imageMessage.textContent = "Please enter a valid positive number for the scale factor.";
        imageMessage.style.color = 'red';
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
    const filename = getDownloadFilename('image-enlarger-filename', `enlarged-image-x${scaleFactor}.png`, 'png');
    const newEnlargedImage = new Image();
    newEnlargedImage.onload = () => {
        uploadedImage = newEnlargedImage;
        updateImageResult(enlargedDataUrl, filename);
        currentImageState = enlargedDataUrl;
        hideLoading();
        imageMessage.textContent = `Image enlarged by x${scaleFactor} successfully!`;
        imageMessage.style.color = '#28a745';
    };
    newEnlargedImage.src = enlargedDataUrl;
}


// Implements Color Picker
function pickColor(e) {
    if (currentToolId !== 'color-picker' || !uploadedImage) {
        imageMessage.textContent = "Please upload an image first to pick colors.";
        imageMessage.style.color = 'orange';
        return;
    }
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
    imageMessage.textContent = `Color picked: ${hex}`;
    imageMessage.style.color = '#28a745';
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
        imageMessage.textContent = "Please upload an image first.";
        imageMessage.style.color = 'orange';
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
    const filename = getDownloadFilename('meme-generator-filename', 'generated-meme.png', 'png');
    const newMemeImage = new Image();
    newMemeImage.onload = () => {
        uploadedImage = newMemeImage;
        updateImageResult(memeDataUrl, filename);
        currentImageState = memeDataUrl;
        hideLoading();
        imageMessage.textContent = "Meme generated successfully!";
        imageMessage.style.color = '#28a745';
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
        imageMessage.textContent = "Please select images for the collage.";
        imageMessage.style.color = 'orange';
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
            imageMessage.textContent = "No valid images loaded for collage.";
            imageMessage.style.color = 'red';
            hideLoading();
            return;
        }

        let collageCanvas = document.createElement('canvas');
        let collageCtx = collageCanvas.getContext('2d');
        let collageDataUrl;
        let defaultFilename = 'collage.png';

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
            if (loadedImages.length < 4) {
                imageMessage.textContent = "Please upload at least 4 images for a 2x2 grid.";
                imageMessage.style.color = 'orange';
                hideLoading();
                return;
            }
            const img1 = loadedImages[0], img2 = loadedImages[1], img3 = loadedImages[2], img4 = loadedImages[3];
            const cellWidth = Math.max(img1.naturalWidth, img2.naturalWidth, img3.naturalWidth, img4.naturalWidth);
            const cellHeight = Math.max(img1.naturalHeight, img2.naturalHeight, img3.naturalHeight, img4.naturalHeight);
            collageCanvas.width = cellWidth * 2;
            collageCanvas.height = cellHeight * 2;
            collageCtx.drawImage(img1, 0, 0, cellWidth, cellHeight);
            collageCtx.drawImage(img2, cellWidth, 0, cellWidth, cellHeight);
            collageCtx.drawImage(img3, 0, cellHeight, cellWidth, cellHeight);
            collageCtx.drawImage(img4, cellWidth, cellHeight, cellWidth, cellHeight);
            defaultFilename = 'collage_2x2.png';
        } else if (layout === '1x2') { // One top, two below
            if (loadedImages.length < 3) {
                imageMessage.textContent = "Please upload at least 3 images for a 1x2 layout.";
                imageMessage.style.color = 'orange';
                hideLoading();
                return;
            }
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
            defaultFilename = 'collage_1x2.png';
        } else if (layout === '2x1') { // Two top, one below
            if (loadedImages.length < 3) {
                imageMessage.textContent = "Please upload at least 3 images for a 2x1 layout.";
                imageMessage.style.color = 'orange';
                hideLoading();
                return;
            }
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
            defaultFilename = 'collage_2x1.png';
        }

        collageDataUrl = collageCanvas.toDataURL('image/png');
        const filename = getDownloadFilename('collage-maker-filename', defaultFilename, 'png');
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

// Implements Merge Images (Legacy)
async function mergeImages() {
    if (!uploadedImage || !uploadedImage2) {
        imageMessage.textContent = "Please upload both images first for merging.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading();
    saveImageState();

    const mergeDirection = document.getElementById('merge-direction').value;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    let mergedWidth, mergedHeight;
    if (mergeDirection === 'horizontal') {
        mergedWidth = uploadedImage.naturalWidth + uploadedImage2.naturalWidth;
        mergedHeight = Math.max(uploadedImage.naturalHeight, uploadedImage2.naturalHeight);
    } else { // vertical
        mergedWidth = Math.max(uploadedImage.naturalWidth, uploadedImage2.naturalWidth);
        mergedHeight = uploadedImage.naturalHeight + uploadedImage2.naturalHeight;
    }

    tempCanvas.width = mergedWidth;
    tempCanvas.height = mergedHeight;

    tempCtx.drawImage(uploadedImage, 0, 0);
    if (mergeDirection === 'horizontal') {
        tempCtx.drawImage(uploadedImage2, uploadedImage.naturalWidth, 0);
    } else {
        tempCtx.drawImage(uploadedImage2, 0, uploadedImage.naturalHeight);
    }

    const mergedDataUrl = tempCanvas.toDataURL('image/png');
    const filename = getDownloadFilename('merge-images-filename', 'merged-image.png', 'png');

    const newMergedImage = new Image();
    newMergedImage.onload = () => {
        uploadedImage = newMergedImage;
        updateImageResult(mergedDataUrl, filename);
        currentImageState = mergedDataUrl;
        hideLoading();
        imageMessage.textContent = "Images merged successfully!";
        imageMessage.style.color = '#28a745';
    };
    newMergedImage.src = mergedDataUrl;
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
            updateImageResult(img.src); hideLoading();
            imageMessage.textContent = "Last operation undone.";
            imageMessage.style.color = '#28a745';
        };
        img.src = lastState;
        if (imageHistory.length === 0) { imageUndoButton.disabled = true; }
    } else {
        imageMessage.textContent = "No more operations to undo. Clearing image display.";
        imageMessage.style.color = 'orange';
        uploadedImage = null; currentImageState = null;
        imageResultImg.style.display = 'none'; imageCanvas.style.display = 'none';
        imageDownloadLink.style.display = 'none'; splitImagesDisplay.innerHTML = '';
        splitImagesDisplay.style.display = 'none'; imageUndoButton.disabled = true;
        hideLoading();
    }
}

// Convert Any File to Image functionality
let selectedFileToConvert = null; // Store the file object

uploadFileToImageInput?.addEventListener('change', function(e) {
    selectedFileToConvert = e.target.files[0];
    if (selectedFileToConvert) {
        detectedFileTypeSpan.textContent = selectedFileToConvert.type || 'Unknown';
        // Check if the file type is directly convertible to an image
        if (selectedFileToConvert.type.startsWith('image/')) {
            conversionStatusSpan.textContent = 'Ready for conversion to other image formats.';
            conversionStatusSpan.style.color = '#28a745'; // Green
            convertFileToImageButton.disabled = false;
        } else if (selectedFileToConvert.type === 'application/pdf') {
            conversionStatusSpan.textContent = 'PDF to Image conversion supported (renders first page).';
            conversionStatusSpan.style.color = '#28a745'; // Green
            convertFileToImageButton.disabled = false;
        } else if (selectedFileToConvert.type.startsWith('text/') || selectedFileToConvert.type === 'application/json' || selectedFileToConvert.type === 'application/xml') {
            conversionStatusSpan.textContent = 'Text-based file. Will convert content to image. Complex layouts may not be preserved.';
            conversionStatusSpan.style.color = 'orange'; // Orange for warning
            convertFileToImageButton.disabled = false;
        }
        else {
            conversionStatusSpan.textContent = 'Conversion not directly supported. Will attempt to render as plain text or a placeholder.';
            conversionStatusSpan.style.color = 'red'; // Red for unsupported
            convertFileToImageButton.disabled = false; // Still allow trying
        }
    } else {
        detectedFileTypeSpan.textContent = 'N/A';
        conversionStatusSpan.textContent = 'Please upload a file.';
        conversionStatusSpan.style.color = '#666';
        convertFileToImageButton.disabled = true;
    }
});

convertFileToImageButton?.addEventListener('click', convertFileToImage);

async function convertFileToImage() {
    if (!selectedFileToConvert) {
        imageMessage.textContent = "Please upload a file first.";
        imageMessage.style.color = 'orange';
        return;
    }
    showLoading();
    imageMessage.textContent = ''; // Clear previous messages

    const targetFormat = targetImageFormatSelect.value;
    const fileNameWithoutExt = selectedFileToConvert.name.split('.').slice(0, -1).join('.'); // Get name without extension
    const outputExtension = targetFormat.split('/')[1].replace('jpeg', 'jpg');
    const filename = getDownloadFilename('convert-to-image-filename', `${fileNameWithoutExt}-converted.${outputExtension}`, outputExtension);

    let imageDataUrl = null;

    try {
        if (selectedFileToConvert.type.startsWith('image/')) {
            // If it's already an image, just convert format
            const reader = new FileReader();
            reader.readAsDataURL(selectedFileToConvert);
            await new Promise(resolve => reader.onload = resolve);
            const img = new Image();
            img.src = reader.result;
            await new Promise(resolve => img.onload = resolve);

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            tempCtx.drawImage(img, 0, 0);
            imageDataUrl = tempCanvas.toDataURL(targetFormat);

        } else if (selectedFileToConvert.type === 'application/pdf') {
            // PDF to Image conversion (renders first page)
            const arrayBuffer = await selectedFileToConvert.arrayBuffer();
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            // Ensure worker path is correct. This needs to be relative to the server if not using CDN.
            // For CDN, it often works implicitly or needs an explicit path.
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.189/pdf.worker.min.mjs';

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1); // Render the first page

            const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed for better quality
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            imageDataUrl = canvas.toDataURL(targetFormat);

        } else if (selectedFileToConvert.type.startsWith('text/') || selectedFileToConvert.type === 'application/json' || selectedFileToConvert.type === 'application/xml') {
            // Text file to image (simple rendering on canvas)
            const textContent = await selectedFileToConvert.text();
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            // Dynamic canvas size based on text content (rough estimate)
            const fontSize = 16;
            const lineHeight = 20;
            const maxWidth = 800; // Max width for text wrapping
            tempCtx.font = `${fontSize}px Arial`;

            const lines = textContent.split('\n');
            let currentY = lineHeight;
            let currentMaxLineWidth = 0;

            // Calculate height and width for canvas
            for (const line of lines) {
                const words = line.split(' ');
                let currentLine = '';
                for (const word of words) {
                    const testLine = currentLine === '' ? word : currentLine + ' ' + word;
                    const metrics = tempCtx.measureText(testLine);
                    if (metrics.width > maxWidth && currentLine !== '') {
                        currentY += lineHeight;
                        currentMaxLineWidth = Math.max(currentMaxLineWidth, tempCtx.measureText(currentLine).width);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                currentY += lineHeight;
                currentMaxLineWidth = Math.max(currentMaxLineWidth, tempCtx.measureText(currentLine).width);
            }

            tempCanvas.width = Math.min(currentMaxLineWidth + 40, 1200); // Add padding, cap max width
            tempCanvas.height = currentY + 40; // Add padding

            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.font = `${fontSize}px Arial`;
            tempCtx.fillStyle = '#000000';
            tempCtx.textBaseline = 'top';
            let drawY = 20; // Initial Y for drawing

            // Redraw text on resized canvas
            for (const line of lines) {
                const words = line.split(' ');
                let currentLine = '';
                for (const word of words) {
                    const testLine = currentLine === '' ? word : currentLine + ' ' + word;
                    const metrics = tempCtx.measureText(testLine);
                    if (metrics.width > maxWidth && currentLine !== '') {
                        tempCtx.fillText(currentLine, 20, drawY);
                        drawY += lineHeight;
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                tempCtx.fillText(currentLine, 20, drawY);
                drawY += lineHeight;
            }

            imageDataUrl = tempCanvas.toDataURL(targetFormat);

        } else {
            // For other unsupported file types, create a placeholder image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = 600;
            tempCanvas.height = 400;
            tempCtx.fillStyle = '#f0f0f0';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.fillStyle = '#333';
            tempCtx.font = '20px Arial';
            tempCtx.textAlign = 'center';
            tempCtx.fillText('Unsupported File Type', tempCanvas.width / 2, tempCanvas.height / 2 - 20);
            tempCtx.fillText(`Cannot convert "${selectedFileToConvert.type}" to image.`, tempCanvas.width / 2, tempCanvas.height / 2 + 10);
            imageDataUrl = tempCanvas.toDataURL(targetFormat);
        }

        const newImage = new Image();
        newImage.onload = () => {
            uploadedImage = newImage; // Set the result as the new uploaded image
            updateImageResult(imageDataUrl, filename);
            currentImageState = imageDataUrl;
            imageMessage.textContent = 'File converted to image successfully!';
            imageMessage.style.color = '#28a745';
            hideLoading();
        };
        newImage.src = imageDataUrl;

    } catch (error) {
        console.error("Error converting file to image:", error);
        imageMessage.textContent = `Error during conversion: ${error.message}. Please try another file.`;
        imageMessage.style.color = 'red';
        hideLoading();
    }
}

// Logo Design Functionality
async function generateLogo() {
    const description = logoDescriptionInput.value.trim();
    if (!description) {
        imageMessage.textContent = "Please enter a description for your logo idea.";
        imageMessage.style.color = 'orange';
        return;
    }

    showLoading();
    imageMessage.textContent = 'Generating your logo... this might take a moment.';
    imageMessage.style.color = '#007bff';
    imageDownloadLink.style.display = 'none'; // Hide download link until ready
    imageCanvas.style.display = 'none';
    imageResultImg.style.display = 'none';

    // Construct a more specific prompt for logo generation
    const prompt = `Generate a professional and aesthetically pleasing logo for a business/concept described as: "${description}". The logo should be iconic, modern, and ideally minimalistic, focusing on a single, clear visual concept. Ensure it is distinct and scalable.`;

    try {
        console.log("Sending API request for logo generation...");
        const payload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1 } };
        const apiKey = ""; // Canvas will automatically provide the API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Response:", errorData);
            throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const result = await response.json();
        console.log("API Result:", result);

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            const imageDataUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            const filename = getDownloadFilename('logo-design-filename', 'my-new-logo.png', 'png');

            const newLogoImage = new Image();
            newLogoImage.onload = () => {
                uploadedImage = newLogoImage; // Update the main image reference
                updateImageResult(imageDataUrl, filename);
                currentImageState = imageDataUrl;
                imageMessage.textContent = 'Logo generated successfully!';
                imageMessage.style.color = '#28a745';
                hideLoading();
                console.log("Logo displayed and download link set.");
            };
            newLogoImage.onerror = () => {
                console.error("Failed to load generated image from data URL.");
                throw new Error("Failed to load generated image.");
            };
            newLogoImage.src = imageDataUrl;

        } else {
            console.warn("API response missing image data or unexpected structure.", result);
            throw new Error("No image data received from the API or unexpected response structure.");
        }

    } catch (error) {
        console.error("Caught error during logo generation:", error);
        imageMessage.textContent = `Error: Could not generate logo. ${error.message}. Please try again with a different description.`;
        imageMessage.style.color = 'red';
        hideLoading();
        // Clear previous result if any
        imageResultImg.style.display = 'none';
        imageDownloadLink.style.display = 'none';
    }
}


// --- CONVERT TOOLS FUNCTIONS ---

// Generic Image Converter (JPG, PNG, WebP)
async function imageConverter() {
    const fileInput = document.getElementById('upload-image-converter-input');
    const file = fileInput.files[0];
    const targetFormat = imageConvertFormatSelect.value;

    if (!file) {
        convertMessage.textContent = "Please select an image file to convert.";
        convertMessage.style.color = 'orange';
        return;
    }
    if (!file.type.startsWith('image/')) {
        convertMessage.textContent = "Please select a valid image file.";
        convertMessage.style.color = 'red';
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
        const filename = getDownloadFilename('image-converter-filename', `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`, extension);

        convertDownloadLink.href = convertedDataUrl;
        convertDownloadLink.download = filename;
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

// PDF to JPG conversion using pdf.js
async function pdfToJpg() {
    const file = uploadPdfToJpgInput.files[0];
    if (!file) {
        convertMessage.textContent = "Please select a PDF file.";
        convertMessage.style.color = 'orange';
        return;
    }
    if (file.type !== 'application/pdf') {
        convertMessage.textContent = "Please select a valid PDF file.";
        convertMessage.style.color = 'red';
        return;
    }

    showLoading();
    convertMessage.style.display = 'none';
    convertDownloadLink.style.display = 'none';
    bulkConvertResultsDisplay.innerHTML = '';
    bulkConvertResultsDisplay.style.display = 'none';

    try {
        // PDF.js is loaded as a module in index.html
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        // Set the workerSrc to the correct path where pdf.worker.min.mjs is located
        // This is crucial for pdf.js to work correctly in the browser.
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.189/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        const zip = new JSZip(); // To zip multiple JPGs if needed
        const zipFilename = getDownloadFilename('pdf-to-jpg-filename', `${file.name.replace(/\.[^/.]+$/, "")}_converted_pages.zip`, 'zip');


        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); // Render at 1.5x resolution for better quality
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Convert to JPEG with 90% quality
            const pageFilename = `${file.name.replace(/\.[^/.]+$/, "")}_page_${i}.jpg`;

            // Display preview for each page
            const imgLink = document.createElement('a');
            imgLink.href = imageDataUrl;
            imgLink.download = pageFilename;
            const imgElement = document.createElement('img');
            imgElement.src = imageDataUrl;
            imgElement.alt = `Page ${i}`;
            imgElement.style.maxWidth = '200px';
            imgElement.style.maxHeight = '200px';
            imgLink.appendChild(imgElement);
            bulkConvertResultsDisplay.appendChild(imgLink);

            // Add to zip file
            const base64Data = imageDataUrl.split(',')[1];
            zip.file(pageFilename, base64Data, { base64: true });
        }

        if (numPages > 0) {
            zip.generateAsync({ type: "blob" })
                .then(function (content) {
                    const url = URL.createObjectURL(content);
                    convertDownloadLink.href = url;
                    convertDownloadLink.download = zipFilename;
                    convertDownloadLink.style.display = 'inline-block';
                    convertMessage.textContent = `Converted ${numPages} PDF page(s) to JPG. Download as ZIP.`;
                    convertMessage.style.color = '#28a745';
                    convertMessage.style.display = 'block';
                    bulkConvertResultsDisplay.style.display = 'flex'; // Show the preview container
                });
        } else {
            convertMessage.textContent = 'No pages found in PDF or failed to convert.';
            convertMessage.style.color = 'red';
            convertMessage.style.display = 'block';
        }

    } catch (error) {
        console.error("Error converting PDF to JPG:", error);
        convertMessage.textContent = `Error: Could not convert PDF to JPG. ${error.message}. Try another PDF.`;
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
        convertMessage.textContent = "Please select an SVG file to convert.";
        convertMessage.style.color = 'orange';
        return;
    }
    if (file.type !== 'image/svg+xml') {
        convertMessage.textContent = "Please select a valid SVG file.";
        convertMessage.style.color = 'red';
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
        const filename = getDownloadFilename('svg-converter-filename', `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`, extension);

        convertDownloadLink.href = convertedDataUrl;
        convertDownloadLink.download = filename;
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
    if (files.length === 0) {
        pdfMessage.textContent = "Please select at least one PDF file to merge.";
        pdfMessage.style.color = 'orange';
        return;
    }
    showLoading(); pdfMessage.style.display = 'none'; pdfDownloadLink.style.display = 'none';
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        let processedCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type !== 'application/pdf') {
                console.warn(`Skipping non-PDF file: ${file.name}`);
                continue;
            }
            const arrayBuffer = await file.arrayBuffer();
            const donorPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await pdfDoc.copyPages(donorPdfDoc, donorPdfDoc.getPageIndices());
            copiedPages.forEach((page) => pdfDoc.addPage(page));
            processedCount++;
        }
        if (processedCount === 0) {
            pdfMessage.textContent = "No valid PDF files were found or processed for merging.";
            pdfMessage.style.color = 'red';
            hideLoading();
            return;
        }
        const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const filename = getDownloadFilename('merge-pdf-filename', 'merged_document.pdf', 'pdf');
        pdfDownloadLink.href = url; pdfDownloadLink.download = filename;
        pdfDownloadLink.style.display = 'inline-block';
        pdfMessage.textContent = 'PDF merged successfully!'; pdfMessage.style.color = '#28a745';
        pdfMessage.style.display = 'block';
    } catch (error) {
        console.error("Error merging PDFs:", error);
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
        pdfMessage.textContent = "Please select a PDF file to compress.";
        pdfMessage.style.color = 'orange';
        return;
    }
    if (file.type !== 'application/pdf') {
        pdfMessage.textContent = "Please select a valid PDF file.";
        pdfMessage.style.color = 'red';
        return;
    }

    showLoading();
    pdfMessage.style.display = 'none';
    pdfDownloadLink.style.display = 'none';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

        const newPdfDoc = await PDFLib.PDFDocument.create();

        for (const page of pdfDoc.getPages()) {
            const { width, height } = page.getSize();
            const newPage = newPdfDoc.addPage([width, height]);

            // Copy original content stream
            const contentStream = await page.getContents();
            newPage.setContents(contentStream);
        }

        const pdfBytes = await newPdfDoc.save({
            use: [PDFLib.Default="PDFDefault", PDFLib.FlateStream, PDFLib.JPEG], // Apply general stream compression and optimize JPEGs
            updateMetadata: true, // Update metadata
        });

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const filename = getDownloadFilename('compress-pdf-filename', `compressed_${file.name}`, 'pdf');
        pdfDownloadLink.href = url;
        pdfDownloadLink.download = filename;
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
async function convertImagesToPdf(files, outputFileName = 'images_to_pdf.pdf', filenameInputId) {
    if (files.length === 0) {
        pdfMessage.textContent = "Please select at least one image file to convert to PDF.";
        pdfMessage.style.color = 'orange';
        return;
    }
    showLoading(); pdfMessage.style.display = 'none'; pdfDownloadLink.style.display = 'none';
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        let processedCount = 0;
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
            processedCount++;
        }
        if (processedCount === 0) {
            pdfMessage.textContent = "No supported images (JPEG, PNG, or WebP) were found to convert to PDF.";
            pdfMessage.style.color = 'red';
            hideLoading();
            return;
        }
        const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const filename = getDownloadFilename(filenameInputId, outputFileName, 'pdf');
        pdfDownloadLink.href = url; pdfDownloadLink.download = filename;
        pdfDownloadLink.style.display = 'inline-block';
        pdfMessage.textContent = 'Images converted to PDF successfully!'; pdfMessage.style.color = '#28a745';
        pdfMessage.style.display = 'block';
    } catch (error) {
        console.error("Error converting images to PDF:", error);
        pdfMessage.textContent = `Error: Could not convert images to PDF. ${error.message}`;
        pdfMessage.style.color = 'red'; pdfMessage.style.display = 'block';
    } finally { hideLoading(); }
}

async function imagesToPdf() { await convertImagesToPdf(uploadImagesToPdfInput.files, 'images_to_pdf.pdf', 'image-to-pdf-filename'); }
async function jpgsToPdf() { await convertImagesToPdf(uploadJpgsToPdfInput.files, 'jpgs_to_pdf.pdf', 'jpg-to-pdf-filename'); }
async function pngsToPdf() { await convertImagesToPdf(uploadPngsToPdfInput.files, 'pngs_to_pdf.pdf', 'png-to-pdf-filename'); }


// --- VIDEO TOOLS FUNCTIONS (PLACEHOLDERS) ---

// This section is a placeholder for video editing functionalities.
// Client-side video processing (trimming, adding/removing audio, watermarking, converting)
// is highly complex and requires specialized libraries that are typically large (e.g., FFmpeg.WASM).
// Implementing these features fully would significantly increase the bundle size and complexity
// of this simple demo application.
// For now, these functions will only display messages.

async function handleVideoUploadCommon(e) {
    const file = e.target.files[0];
    if (file) {
        videoMessage.textContent = `Video selected: ${file.name}. Functionality not yet implemented.`;
        videoMessage.style.color = '#555';
        videoDownloadLink.style.display = 'none'; // Ensure download link is hidden
    } else {
        videoMessage.textContent = 'Upload a video to get started.';
        videoMessage.style.color = '#666';
    }
}

// These functions would contain the complex video processing logic
function addMusicToVideo() {
    videoMessage.textContent = "Adding music to video functionality coming soon! Requires advanced video/audio libraries.";
    videoMessage.style.color = '#ffc107'; // Yellow for warning/coming soon
}

function removeBackgroundMusic() {
    videoMessage.textContent = "Removing background music functionality coming soon! Requires advanced audio processing.";
    videoMessage.style.color = '#ffc107';
}

function adjustBackgroundMusic() {
    videoMessage.textContent = "Adjusting background music volume functionality coming soon! Requires advanced audio processing.";
    videoMessage.style.color = '#ffc107';
}

// These are placeholders for other video tools
function trimVideo() {
    videoMessage.textContent = "Video trimming functionality coming soon! Requires advanced video processing.";
    videoMessage.style.color = '#ffc107';
}

function convertVideo() {
    videoMessage.textContent = "Video conversion functionality coming soon! Requires advanced video encoding.";
    videoMessage.style.color = '#ffc107';
}

function addWatermark() {
    videoMessage.textContent = "Adding watermark functionality coming soon! Requires advanced video processing.";
    videoMessage.style.color = '#ffc107';
}


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
    if (files.length > 0) { // No longer strict image type check here, let specific tools handle
        // If 'Convert Any File to Image' is the active tool, direct drop to its input
        if (currentToolId === 'convert-to-image') {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            uploadFileToImageInput.files = dataTransfer.files;
            uploadFileToImageInput.dispatchEvent(new Event('change', { bubbles: true }));
            imageMessage.textContent = `Dropped file. Click "Convert to Image".`;
            imageMessage.style.color = '#555';
        } else if (files[0].type.startsWith('image/')) { // For other image tools, only accept images
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            uploadImageCommonInput.files = dataTransfer.files;
            uploadImageCommonInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
             imageMessage.textContent = "Only image files are supported for this tool via drag and drop.";
             imageMessage.style.color = 'orange';
        }
    } else {
        imageMessage.textContent = "Please drop a file.";
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
                imageMessage.textContent = "Could not load image. Please ensure it's a valid image file.";
                imageMessage.style.color = 'red';
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
                imageMessage.textContent = `Second image loaded: ${file.name}.`;
                imageMessage.style.color = '#28a745';
            };
            img2.onerror = () => {
                imageMessage.textContent = "Could not load second image. Please ensure it's a valid image file.";
                imageMessage.style.color = 'red';
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
        } else if (currentToolId === 'pdf-to-jpg' && files[0].type === 'application/pdf') { // Handle PDF to JPG drop
             const dataTransfer = new DataTransfer();
             dataTransfer.items.add(files[0]);
             uploadPdfToJpgInput.files = dataTransfer.files;
             uploadPdfToJpgInput.dispatchEvent(new Event('change', { bubbles: true }));
             convertMessage.textContent = `Dropped 1 PDF file. Click "Convert PDF to JPG".`;
             convertMessage.style.color = '#555';
        }
        else {
            convertMessage.textContent = `Dropped ${files.length} file(s). Functionality not yet implemented for this tool or unsupported file type.`;
            convertMessage.style.color = '#555';
        }
    } else {
        convertMessage.textContent = 'No files dropped.';
        convertMessage.style.color = 'orange';
    }
});

// Video Upload Area (Drag and Drop) - NEW
videoUploadArea.addEventListener('dragenter', preventDefaults, false);
videoUploadArea.addEventListener('dragover', preventDefaults, false);
videoUploadArea.addEventListener('dragleave', unhighlight, false);
videoUploadArea.addEventListener('drop', unhighlight, false);
videoUploadArea.addEventListener('dragenter', highlight, false);
videoUploadArea.addEventListener('dragover', highlight, false);

videoUploadArea.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0 && files[0].type.startsWith('video/')) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        uploadVideoCommonInput.files = dataTransfer.files;
        uploadVideoCommonInput.dispatchEvent(new Event('change', { bubbles: true })); // Trigger change
    } else {
        videoMessage.textContent = 'Please drop a video file.';
        videoMessage.style.color = 'orange';
    }
});

// Listen for file selection on the common video upload input - NEW
uploadVideoCommonInput.addEventListener('change', handleVideoUploadCommon);


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
