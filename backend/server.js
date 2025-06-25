require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');
const multer = require("multer");
// const { updateColor, updateSpacing } = require('./themeLogic'); // Import your logic
const app = express();
const PORT = process.env.PORT || 3001;
const submitHex = require('./controllers/color-algo');
const formatColorMappings = require('./controllers/color-formatter');

const sharp = require("sharp");
const { kmeans } = require("ml-kmeans");

const cors = require('cors');

// const readmePath = path.join(__dirname, 'controllers/GUARDRAILS.md');
// const readmeContent = fs.readFileSync(readmePath, 'utf-8');
const readmePath = path.join(__dirname, 'controllers/STYLINGHOOKS.md');

const fs = require('fs');

app.use(express.json());
// app.use(cors({
//   origin: 'http://localhost:3000', // URL of your React app
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type']
// }));
app.use(cors({ origin: "*" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_ROLE_MSG = `You are a theming assistant. 

    You ONLY support:
    - Colors (Brand and Feedback)
    - Brand image as Global logo 
    - Spacings (Density)
    - Font Sizes

    Otherwise, respond normally for any other inquiries in the context of Themimg & Branding only.

    Remember to only respond based on the supported capabilities mentioned above.

    Also, if someone asks for customising a particular color, refer the STYLING HOOKS guide, ${readmePath} we auhored and please respond appropriately. Don't share this guide details in the responses as this is only for the understanding.

    Only call the setBrandLogo function if the user has uploaded an image first. If no image has been uploaded, inform the user to upload an image first before setting the brand logo.
    
    Also, if someone asks for changing the font-size or spacings, respond by saying that these are generally scale based and can be updated relatively only. It expects values in form of percentages like x% which is 110% or 90% or in multiplication factor like 1.1 times or 0.9 times.

    If they ask for changing something which is not supported by our system, please reply that it is not supported now and will let the team know.

    Don't talk about additional help or detailed guidlines. You are just here to check if the request is in the scope of Theming & Branding supported capabilities or just respond saying that currently you do not have capability to support it.

    Remember the user's preferences from recent exchanges. Respond based on previous queries if they are closely related.

    Please format the replies in more readable format
    
    Keep responses concise, user-friendly and add slight humour to it.`;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // Save files in "uploads" directory
    },
    filename: (req, file, cb) => {
      cb(null, "custom-brand-logo.png"); // Unique filename
    },
  });
  
  const upload = multer({ storage: storage });

app.post('/api/chat', upload.single("image"), async (req, res) => {
    const { message } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    console.log("ENDPOINT: INPUT MESSAGE RECEIVED: ", message);
    if (imagePath) console.log("Image saved at:", imagePath);

    try {
      console.log("OPENAI ENDPOINT: MESSAGE CONFIGURED: ", message);
        // Step 1: Send message to OpenAI
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: `${SYSTEM_ROLE_MSG}` },
                { role: 'user', content: message }
            ],
            tools: tools,
            tool_choice: "auto" // Let the model choose when to call tools
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const toolCalls = response.data.choices[0].message.tool_calls;
        if (toolCalls) {
            var {reply, data, category} = await handleToolCalls(toolCalls);
            console.log("TOOL TALK");
            console.log({reply, data, category});
            res.json({ reply, data, category });
        }
        else {
            var generic_reply = response.data.choices[0].message.content;
            generic_reply = generic_reply.replace(/\*\*/g, "");
            console.log("CASUAL TALK RESPONSE", generic_reply);
            res.json({ reply: generic_reply });
        }
    } catch (error) {
        console.error('Error:', error.message, 'Error data:',error.response?.data);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

const tools = [
    {
      type: "function",
      function: {
        name: "applyBrandColor",
        description: "Apply/Update the branding of the app with the input color",
        parameters: {
          type: "object",
          properties: {
            color: {
                type: "string",
                description: "The brand color in HEX format (e.g., '#FF5733') or just a string like 'blue' or 'red'"
              },
          },
          required: ["color"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "applyFeedbackColor",
        description: "Apply/Update the feedback states of the app with the input color. Feedback states can be from success, error, warning and info.",
        parameters: {
          type: "object",
          properties: {
            color: {
                type: "string",
                description: "The color should be in HEX format (e.g., '#FF5733') or just a string like 'blue' or 'red'"
              },
            state: {
              type: "string",
              description: "The state of the feedback color which was requested to set. It can be anything from success, warning, error and info"
            },
          },
          required: ["color", "state"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateSpacings",
        description: "To update the spacings in the app.",
        parameters: {
          type: "object",
          properties: {
            relativity: {
                type: "string",
                description: "This is the 'relativity' factor mentioned in the statement. It's more of a number like percentage or multiplication factor"
              },
          },
          required: ["relativity"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateFontSizes",
        description: "To update the font sizes in the app.",
        parameters: {
          type: "object",
          properties: {
            relativity: {
                type: "string",
                description: "This is the 'relativity' factor mentioned in the statement. It's more of a number like percentage or multiplication factor"
              },
          },
          required: ["relativity"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "setBrandLogo",
        description: "Sets a new brand logo using an uploaded image. The image must be uploaded before calling this function.",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["set", "apply", "configure"],
              description: "Defines the action to apply for the uploaded logo."
            },
            target: {
              type: "string",
              enum: ["brand logo"],
              description: "Specifies what is being updated."
            }
          },
          required: ["action", "target"]
        }
      }
    },
    {
      type: "function",
        function: {
          name: "extractBrandColors",
          description: "Extract dominant brand colors from the uploaded logo.",
          parameters: {
            type: "object",
            properties: {},  // No parameters needed since the file path is fixed
          },
        },
  
    }
  ];

  async function handleToolCalls(toolCalls) {
    let styleMappings, reply;
    let category = "";
    for (const call of toolCalls) {
      if (call.function.name === "applyBrandColor") {
        const params = JSON.parse(call.function.arguments);
        console.log("INSIDE APPLYBRAND TOOL CALL", params);
        const colorPalette = submitHex(params.color);
        styleMappings = formatColorMappings(colorPalette, "brand");
        reply = `Here's a fresh look for your design with the brand color, ${params.color}`;
        category = "color";
      }
      else if(call.function.name === "applyFeedbackColor") {
        const params = JSON.parse(call.function.arguments);
        const feedbackcolor = params.color;
        const feedbackState = params.state;
        console.log("INSIDE APPLYFEEDBACK TOOL CALL", feedbackcolor, feedbackState);
        const colorPalette = submitHex(feedbackcolor);
        styleMappings = formatColorMappings(colorPalette, feedbackState);
        console.log("FEEDBACK - " + feedbackState + "STYLEMAPPINGS: ", styleMappings);
        reply = `Here's a fresh look for your design with the feedback state, ${params.state} updated to ${params.color} color`
        category = "color";
      }
      else if(call.function.name === "updateSpacings") {
        const params = JSON.parse(call.function.arguments);
        const relativity = params.relativity;
        console.log("INSIDE updateSpacing TOOL CALL", relativity);
        styleMappings = params.relativity;
        reply = `Spacings are now ${params.relativity}`;
        category = "spacing";
      }
      else if(call.function.name === "updateFontSizes") {
        const params = JSON.parse(call.function.arguments);
        const relativity = params.relativity;
        console.log("INSIDE updateFontSizes TOOL CALL", relativity);
        styleMappings = params.relativity;
        reply = `Font Sizes are now ${params.relativity}`;
        category = "sizing";
      }
      else if(call.function.name === "setBrandLogo") {
        const params = JSON.parse(call.function.arguments);
        console.log("INSIDE setBrandLogo TOOL CALL", params);
        styleMappings = [{
          name: "--lwc-brandLogoImage",
          value: "url('http://localhost:3001/uploads/custom-brand-logo.png')"
        }]
        reply = "The application logo is updated with your uploaded brand image";
        category = "logo";
      }
      else if(call.function.name === "extractBrandColors") {
        const params = JSON.parse(call.function.arguments);
        let extractColorsList = await extractBrandColors();
        console.log("extractColorsList: ", extractColorsList);
        styleMappings = extractColorsList;
        reply = "Here is the list of the dominant colors extracted from your logo. Choose any one and we can set it as your brand color.";
        category = "logoColors";
      }
    }
    return {
      reply: reply,
      data: styleMappings,
      category
    }
  }

  // Function Implementation in Backend (server.js)
const extractBrandColors = async () => {
  try {
    // Define the fixed logo file path
    const imagePath = path.join(__dirname, "../uploads", "custom-brand-logo.png");
    // Call your Python script (or Node.js function) for color extraction
    const extractedColors = await runKMeansColorExtraction(imagePath);
    return { colors: extractedColors }; // Return extracted colors
  } catch (error) {
    console.error("Error extracting brand colors:", error);
    return { error: "Failed to extract brand colors." };
  }
};

const runKMeansColorExtraction = async (imagePath, numColors = 5) => {
  try {
    // Load image and convert it to raw RGB format
    const { data, info } = await sharp(imagePath)
      .resize(100, 100) // Resize for performance
      .ensureAlpha() // Ensure 4 channels (RGBA)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i], data[i + 1], data[i + 2]]); // Extract R, G, B
    }

    // Apply K-Means clustering
    const result = kmeans(pixels, numColors);

    // Convert clusters to hex colors
    const extractedColors = result.centroids.map(([r, g, b]) => 
      `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
    );

    return extractedColors; // Return dominant colors

  } catch (error) {
    console.error("Color extraction failed:", error);
    return [];
  }
};

app.post('/api/text2audio', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required and must be a string.' });
  }

  try {
    // Call OpenAI TTS API
    const ttsResponse = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: message,
        voice: 'alloy', // You can change the voice if you want
        response_format: 'mp3'
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Save the audio file
    const audioFileName = `text2audio_${Date.now()}.mp3`;
    const audioFilePath = path.join(__dirname, '../uploads', audioFileName);
    fs.writeFileSync(audioFilePath, Buffer.from(ttsResponse.data));

    // Return the public URL
    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${audioFileName}`;
    res.json({ audio: audioUrl });
  } catch (error) {
    console.error('TTS Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate audio.' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'theming-ai-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
