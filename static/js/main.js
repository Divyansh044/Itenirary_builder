// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Form submission handling with loading state
    const itineraryForm = document.getElementById('itineraryForm');
    const generateBtn = document.getElementById('generateBtn');
    
    if (itineraryForm) {
        itineraryForm.addEventListener('submit', function() {
            // Show loading state
            generateBtn.innerHTML = '<span class="loading me-2"></span> Generating...';
            generateBtn.disabled = true;
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Auto-format markdown in itinerary content
    const markdownContent = document.querySelector('.markdown-content');
    if (markdownContent) {
        // Simple markdown to HTML conversion
        let content = markdownContent.innerHTML;
        
        // Convert headings (# Heading)
        content = content.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        content = content.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        content = content.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        
        // Convert bold (**text**)
        content = content.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        
        // Convert italic (*text*)
        content = content.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        // Convert line breaks
        content = content.replace(/\n/gim, '<br>');
        
        markdownContent.innerHTML = content;
    }
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});


document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileSidebar = document.querySelector('.mobile-sidebar');
  const overlay = document.querySelector('.mobile-sidebar-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-sidebar .nav-link, .mobile-sidebar .btn-plan');

  // Toggle sidebar when menu button is clicked
  menuToggle.addEventListener('click', function() {
    mobileSidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = mobileSidebar.classList.contains('active') ? 'hidden' : '';
  });

  // Close sidebar when overlay is clicked
  overlay.addEventListener('click', function() {
    mobileSidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  });

  // Close sidebar when a link is clicked
  mobileLinks.forEach(link => {
    link.addEventListener('click', function() {
      mobileSidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
});
// Function to copy the itinerary to clipboard
function copyItinerary() {
    // This function is defined inline in the itinerary.html template
}
const destinations = ["Paris", "Tokyo", "New York", "Bali", "Rome", "Dubai", "Santorini", "London", "Kyoto"];
// Hero slideshow functionality
const heroDestinations = [
  "Bali beaches",
  "Santorini sunset",
  "Swiss Alps",
  "Paris Eiffel Tower at night",
  "Tokyo skyline",
  "Dubai cityscape",
  "Norwegian fjords",
  "Venice canals",
  "Great Wall of China",
  "New York Central Park"
];

async function setupHeroSlideshow() {
  const slideshowContainer = document.getElementById("hero-slideshow");
  
  // Check if the slideshow container exists
  if (!slideshowContainer) {
    console.log("Hero slideshow container not found, skipping slideshow setup");
    return; // Exit the function if element doesn't exist
  }
  
  let slideIndex = 0;

  try {
    // Fetch images from Flask backend instead of Unsplash directly
    const promises = heroDestinations.map(async (query) => {
      const response = await fetch(`/api/unsplash?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`);
      const data = await response.json();
      return data.results.map(img => img.urls.full); // Using 'full' for HD quality
    });

    const results = await Promise.all(promises);
    const slideImages = results.flat();

    // Clear existing slides if any
    slideshowContainer.innerHTML = "";

    slideImages.forEach((imgUrl, index) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      slide.style.backgroundImage = `url(${imgUrl})`;
      slide.style.backgroundSize = "cover";
      slide.style.backgroundPosition = "center";
      slide.style.transition = "opacity 1s ease-in-out";
      slide.style.position = "absolute";
      slide.style.top = "0";
      slide.style.left = "0";
      slide.style.width = "100%";
      slide.style.height = "100%";
      slide.style.opacity = index === 0 ? "1" : "0";
      slideshowContainer.appendChild(slide);
    });

    const slides = slideshowContainer.querySelectorAll(".slide");

    setInterval(() => {
      slides[slideIndex].style.opacity = "0";
      slideIndex = (slideIndex + 1) % slides.length;
      slides[slideIndex].style.opacity = "1";
    }, 6000); // Switch every 6 seconds

  } catch (error) {
    console.error("Hero slideshow setup failed:", error);
    // Only try to set background if the container exists
    if (slideshowContainer) {
      slideshowContainer.style.backgroundImage = "url('https://via.placeholder.com/1920x1080?text=Explore+the+World')";
      slideshowContainer.style.backgroundSize = "cover";
      slideshowContainer.style.backgroundPosition = "center";
    }
  }
}

// Function to create destination cards
function createCard(place, url) {
  return `
    <div class="col-md-4 mb-4">
      <div class="card h-100 shadow-sm destination-card">
        <div class="card-img-container">
          <img src="${url}" class="card-img-top" alt="${place}">
        </div>
        <div class="card-body">
          <h5 class="card-title text-center">${place}</h5>
          <div class="text-center mt-3">
            <button class="btn btn-outline-primary btn-sm" onclick="document.getElementById('destination').value='${place}'; document.getElementById('planning-form').scrollIntoView({behavior: 'smooth'})">
              Plan a trip
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchDestinationImages() {
  const grid = document.getElementById("destination-grid");

  // Exit if grid doesn't exist
  if (!grid) {
    console.log("Destination grid not found, skipping destination image fetch");
    return;
  }

  grid.innerHTML = ''; // Clear any existing content

  for (const place of destinations) {
    try {
      // Construct local image path
      const formattedPlace = place.toLowerCase().replace(/\s+/g, '_'); // e.g., "New York" -> "new_york"
      const imgPath = `/static/unsplash/${formattedPlace}.jpg`;

      // Preload the image to check if it exists
      const img = new Image();
      img.src = imgPath;

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
      });

      grid.innerHTML += createCard(place, imgPath);
    } catch (err) {
      console.error(`Image not found for ${place}, using placeholder`, err);
      grid.innerHTML += createCard(place, "https://via.placeholder.com/400x300");
    }
  }
}


// Add this to your existing script section 
// Form functionality
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupHeroSlideshow();
  } catch (error) {
    console.error("Error in setupHeroSlideshow:", error);
  }
  
  try {
    fetchDestinationImages();
  } catch (error) {
    console.error("Error in fetchDestinationImages:", error);
  }
  
  try {
    setupFormInteraction();
  } catch (error) {
    console.error("Error in setupFormInteraction:", error);
  }
});

function setupFormInteraction() {
  // Step navigation
  const progressBar = document.querySelector('.progress-bar');
  const progressSteps = document.querySelectorAll('.progress-step');
  const formSteps = document.querySelectorAll('.form-step');
  
  // Skip if form elements don't exist
  if (!progressBar || !progressSteps.length || !formSteps.length) {
    console.log("Form elements not found, skipping form interaction setup");
    return;
  }
  
  // Next step buttons
  document.querySelectorAll('.next-step').forEach(button => {
    button.addEventListener('click', () => {
      const currentStep = button.closest('.form-step');
      const nextStepId = button.getAttribute('data-next');
      const nextStep = document.getElementById(`step-${nextStepId}`);
      
      if (!currentStep || !nextStep) return;
      
      // Basic validation
      let isValid = true;
      const inputs = currentStep.querySelectorAll('input[required], select[required]');
      inputs.forEach(input => {
        if (!input.value) {
          isValid = false;
          input.classList.add('is-invalid');
        } else {
          input.classList.remove('is-invalid');
        }
      });
      
      if (!isValid) return;
      
      // Transition to next step
      currentStep.classList.remove('active');
      nextStep.classList.add('active');
      
      // Update progress
      const stepIndex = Array.from(formSteps).findIndex(step => step === nextStep);
      updateProgress(stepIndex);
      
      // Update summary if going to final step
      if (nextStepId === 'generate') {
        updateSummary();
      }
    });
  });
  
  // Previous step buttons
  document.querySelectorAll('.prev-step').forEach(button => {
    button.addEventListener('click', () => {
      const currentStep = button.closest('.form-step');
      const prevStepId = button.getAttribute('data-prev');
      const prevStep = document.getElementById(`step-${prevStepId}`);
      
      if (!currentStep || !prevStep) return;
      
      // Transition to previous step
      currentStep.classList.remove('active');
      prevStep.classList.add('active');
      
      // Update progress
      const stepIndex = Array.from(formSteps).findIndex(step => step === prevStep);
      updateProgress(stepIndex);
    });
  });
  
  // Update progress bar and steps
  function updateProgress(stepIndex) {
    const percentage = (stepIndex / (formSteps.length - 1)) * 100;
    progressBar.style.width = `${percentage}%`;
    
    progressSteps.forEach((step, index) => {
      if (index <= stepIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }
  
  // Destination pills
  document.querySelectorAll('.destination-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const destination = pill.getAttribute('data-destination');
      const destinationInput = document.getElementById('destination');
      if (destinationInput) {
        destinationInput.value = destination;
        document.querySelectorAll('.destination-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
    });
  });
  
  // Duration range and number sync
  const daysRange = document.getElementById('daysRange');
  const daysInput = document.getElementById('days');
  
  if (daysRange && daysInput) {
    daysRange.addEventListener('input', () => {
      daysInput.value = daysRange.value;
    });
    
    daysInput.addEventListener('input', () => {
      if (daysInput.value > 30) daysInput.value = 30;
      if (daysInput.value < 1) daysInput.value = 1;
      daysRange.value = daysInput.value;
    });
  }
  
  // Duration presets
  document.querySelectorAll('.duration-icon-item').forEach(item => {
    item.addEventListener('click', () => {
      const days = item.getAttribute('data-days');
      if (daysInput && daysRange) {
        daysInput.value = days;
        daysRange.value = days;
        document.querySelectorAll('.duration-icon-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });
  
  // Theme select preview
  const themeSelect = document.getElementById('theme');
  const themePreview = document.getElementById('theme-preview');
  
  const themeDescriptions = {
    'quiet': 'Peaceful experiences with focus on relaxation, nature and rejuvenation.',
    'historical': 'Cultural immersion with museums, landmarks and guided tours.',
    'party': 'Vibrant nightlife with clubs, bars and entertainment venues.',
    'adventure': 'Exciting outdoor activities like hiking, surfing or zip-lining.',
    'family': 'Kid-friendly attractions and activities for all ages.',
    'food': 'Culinary experiences with local cuisine and food tours.',
    'romantic': 'Intimate settings and activities for couples.',
    'shopping': 'Retail therapy at markets, malls and boutiques.'
  };
  
  if (themeSelect && themePreview) {
    themeSelect.addEventListener('change', () => {
      const selectedOption = themeSelect.options[themeSelect.selectedIndex];
      const icon = selectedOption.getAttribute('data-icon');
      const theme = selectedOption.value;
      
      if (theme) {
        themePreview.innerHTML = `
          <div class="theme-icon">
            <i class="fas ${icon}"></i>
          </div>
          <div class="theme-description">
            ${themeDescriptions[theme]}
          </div>
        `;
      }
    });
  }
  
  // Update summary
  function updateSummary() {
    const summaryDestination = document.getElementById('summary-destination');
    const summaryDuration = document.getElementById('summary-duration');
    const summaryBudget = document.getElementById('summary-budget');
    const summaryTheme = document.getElementById('summary-theme');
    const destinationInput = document.getElementById('destination');
    const daysInput = document.getElementById('days');
    
    if (summaryDestination && destinationInput) {
      summaryDestination.textContent = destinationInput.value;
    }
    
    if (summaryDuration && daysInput) {
      summaryDuration.textContent = `${daysInput.value} days`;
    }
    
    const budgetRadio = document.querySelector('input[name="budget"]:checked');
    if (summaryBudget && budgetRadio) {
      const budgetValue = budgetRadio.value;
      let budgetDisplay = '';
      if (budgetValue === 'budget') budgetDisplay = 'Economy';
      else if (budgetValue === 'moderate') budgetDisplay = 'Moderate';
      else if (budgetValue === 'luxury') budgetDisplay = 'Luxury';
      summaryBudget.textContent = budgetDisplay;
    }
    
    if (summaryTheme && themeSelect) {
      const themeText = themeSelect.options[themeSelect.selectedIndex].text;
      summaryTheme.textContent = themeText;
    }
  }
}

function copyItinerary() {
    const itineraryText = document.querySelector('.itinerary-content').innerText;
    navigator.clipboard.writeText(itineraryText).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
        
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy me-1"></i> Copy';
        }, 2000);
    });
}


// JavaScript for Tips Section with Typing Animation
document.addEventListener('DOMContentLoaded', function() {
  // Tips array will be populated from the JSON file
  let tips = [];
  let currentTipIndex = 0;
  let isTyping = false;
  
  // Elements
  const tipTitle = document.getElementById('tip-title');
  const tipDescription = document.getElementById('tip-description');
  const nextTipButton = document.getElementById('next-tip');
  
  // Fetch tips from JSON file
  fetch('/static/data/tips.json')
    .then(response => response.json())
    .then(data => {
      tips = data;
      // Show first tip when loaded
      showRandomTip();
    })
    .catch(error => {
      console.error('Error loading tips:', error);
      // Fallback if JSON can't be loaded - use hardcoded tips from the JSON
      tips = [
        {
          "title": "Pack Light",
          "description": "Only bring essentials. A lighter bag makes travel easier and more flexible."
        },
        {
          "title": "Scan Important Documents",
          "description": "Save copies of your passport, ID, and tickets in your email or cloud storage."
        },
        // More hardcoded tips could be added here
      ];
      showRandomTip();
    });
  
  // Next tip button event listener
  nextTipButton.addEventListener('click', function() {
    if (!isTyping) {
      showRandomTip();
    }
  });
  
  // Show a random tip with typing animation
  function showRandomTip() {
    // Prevent clicking during animation
    isTyping = true;
    
    // Select a random tip (different from current)
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * tips.length);
    } while (tips.length > 1 && newIndex === currentTipIndex);
    
    currentTipIndex = newIndex;
    const tip = tips[currentTipIndex];
    
    // Clear previous content
    tipTitle.textContent = '';
    tipDescription.textContent = '';
    
    // Add typing class for cursor effect
    tipTitle.classList.add('typing');
    
    // Type the title
    typeText(tip.title, tipTitle, function() {
      // When title is done, remove typing class and add it to description
      tipTitle.classList.remove('typing');
      tipDescription.classList.add('typing');
      
      // Start typing description after a short delay
      setTimeout(function() {
        typeText(tip.description, tipDescription, function() {
          // When all typing is done
          tipDescription.classList.remove('typing');
          isTyping = false;
        });
      }, 300);
    });
  }
  
  // Function for typing animation
  function typeText(text, element, callback) {
    let index = 0;
    const speed = 30; // Typing speed in milliseconds
    
    function type() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      } else {
        // Typing finished
        if (callback) callback();
      }
    }
    
    // Start typing
    type();
  }
});