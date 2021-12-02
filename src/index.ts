/* CSCI 5619 Fall 2021
 * Lecture 25: Interaction in Babylon/WebXR
 * Author: Evan Suma Rosenberg <suma@umn.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine, Scene, UniversalCamera, Logger } from "@babylonjs/core";
import { Vector3, Color3, Quaternion, Axis } from "@babylonjs/core";
import { HemisphericLight, DirectionalLight, ShadowGenerator } from "@babylonjs/core";
import { AssetsManager, AbstractMesh, StandardMaterial } from "@babylonjs/core";
import { WebXRCamera, WebXRInputSource, WebXRControllerComponent } from "@babylonjs/core";

// Side effects
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/core/Materials/standardMaterial"
import "@babylonjs/inspector";


class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private rightGrabbedObject: AbstractMesh | null;
    private grabbableObjects: Array<AbstractMesh>;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        // Initialize the XR variables to null
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        // Variables for grabbing objects
        this.rightGrabbedObject = null;
        this.grabbableObjects = [];
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
       // This creates and positions a first-person camera (non-mesh)
       var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
       camera.fov = 90 * Math.PI / 180;

       // This attaches the camera to the canvas
       camera.attachControl(this.canvas, true);

       // Some ambient light to illuminate the scene
       var ambientlight = new HemisphericLight("ambient", Vector3.Up(), this.scene);
       ambientlight.intensity = 1.0;
       ambientlight.diffuse = new Color3(.25, .25, .25);

       // Add a directional light to imitate sunlight
       var directionalLight = new DirectionalLight("sunlight", new Vector3(-1, -2, -1), this.scene);
       directionalLight.position = new Vector3(0, 20, 0);
       directionalLight.intensity = 1.0;

       // Create a shadow genrator
       var shadowGenerator = new ShadowGenerator(1024, directionalLight);
       shadowGenerator.usePercentageCloserFiltering = true;
       shadowGenerator.setDarkness(0.4);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: false,
            skyboxSize: 750,
            skyboxColor: new Color3(.059, .663, .80)
        });

         // Creates the XR experience helper
         const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

         // Remove default teleportation and pointer selection
        xrHelper.teleportation.dispose();
        xrHelper.pointerSelection.dispose();

         // Assigns the web XR camera to a member variable
         this.xrCamera = xrHelper.baseExperience.camera;

         // Assigns the left and right controllers to member variables
         xrHelper.input.onControllerAddedObservable.add((inputSource) => 
         {
            if(inputSource.uniqueId.endsWith("left")) 
            {
                this.leftController = inputSource;
            }
            else 
            {
                this.rightController = inputSource;
            }  
        });
        
         // The assets manager can be used to load multiple assets
         var assetsManager = new AssetsManager(this.scene);

         // Create a task for each asset you want to load
         var worldTask = assetsManager.addMeshTask("world task", "", "assets/", "playground.glb");
         worldTask.onSuccess = (task) => {
             worldTask.loadedMeshes[0].name = "world";
         }
         
         // This loads all the assets and displays a loading screen
         assetsManager.load();
 
         // This will execute when all assets are loaded
         assetsManager.onFinish = (tasks) => {
 
             // Search through the loaded meshes
             worldTask.loadedMeshes.forEach((mesh) => 
             {
                // Find the ground in the original scene
                if(mesh.name == "SM_Box_Ground_01")
                {
                    // Set a new material color
                    var groundMaterial = new StandardMaterial("groundMaterial", this.scene);
                    groundMaterial.diffuseColor = new Color3(.62, .514, .396);
                    groundMaterial.specularColor = Color3.Black();
                    mesh.material = groundMaterial;

                    // The ground should receive shadows
                    mesh.receiveShadows = true;
                }
                else 
                {
                    // Make the object grabbable
                    this.grabbableObjects.push(mesh);

                    // Make the object cast a shadow
                    shadowGenerator.addShadowCaster(mesh);

                }  
                
             });
 
             // Show the debug layer
             this.scene.debugLayer.show();
         }; 
         
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftThumbstick(this.leftController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onLeftX(this.leftController?.motionController?.getComponent("x-button"));
        this.onLeftY(this.leftController?.motionController?.getComponent("y-button"));

        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        this.onRightB(this.rightController?.motionController?.getComponent("b-button"));
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left trigger pressed");
            }
            else
            {
                Logger.Log("left trigger released");
            }
        }     
    }

    private onLeftSqueeze(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left squeeze pressed");
            }
            else
            {
                Logger.Log("left squeeze released");
            }
        }  
    }

    private onLeftX(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left X pressed");
            }
            else
            {
                Logger.Log("left X released");
            }
        }  
    }

    private onLeftY(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left Y pressed");
            }
            else
            {
                Logger.Log("left Y released");
            }
        }  
    }

    private onLeftThumbstick(component?: WebXRControllerComponent)
    {   
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left thumbstick pressed");
            }
            else
            {
                Logger.Log("left thumbstick released");
            }
        }  

        if(component?.changes.axes)
        {
            Logger.Log("left thumbstick axes: (" + component.axes.x + "," + component.axes.y + ")");
        }
    }

    private onRightTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right trigger pressed");
            }
            else
            {
                Logger.Log("right trigger released");
            }
        }  
    }

    private onRightSqueeze(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right squeeze pressed");

                for(var i = 0; i < this.grabbableObjects.length && !this.rightGrabbedObject; i++)
                {
                    if(this.rightController!.grip!.intersectsMesh(this.grabbableObjects[i], true))
                    {
                        this.rightGrabbedObject = this.grabbableObjects[i];
                        this.rightGrabbedObject.setParent(this.rightController!.grip!);
                    }
                }
            }
            else
            {
                Logger.Log("right squeeze released");

                if(this.rightGrabbedObject)
                {
                    this.rightGrabbedObject.setParent(null);
                    this.rightGrabbedObject = null;
                }
            }
        }  
    }

    private onRightA(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right A pressed");
            }
            else
            {
                Logger.Log("right A released");
            }
        }  
    }

    private onRightB(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right B pressed");
            }
            else
            {
                Logger.Log("right B released");
            }
        }  
    }

    private onRightThumbstick(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right thumbstick pressed");
            }
            else
            {
                Logger.Log("right thumbstick released");
            }
        }  

        // Check to see if the controller is connected
        if(component)
        {
            // Get the current camera direction
            var directionVector = this.xrCamera!.getDirection(Axis.Z);

            // Use delta time to calculate the move distance based on speed of 3 m/sec
            var moveDistance = -component!.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the camera forward
            this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

            // Use delta time to calculate the turn angle based on speed of 60 degrees/sec
            var turnAngle = component!.axes.x * (this.engine.getDeltaTime() / 1000) * 60;

            // Smooth turning
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
        }
 
    }  
}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();