local Players = game:GetService("Players")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "OrbitawUI"
screenGui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 280, 0, 320)
frame.Position = UDim2.new(0.5, -140, 0.5, -160) 
frame.BackgroundColor3 = Color3.fromRGB(25, 25, 25)
frame.BorderSizePixel = 0
frame.Active = true
frame.Draggable = true
frame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 6)
corner.Parent = frame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 40)
title.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
title.BorderSizePixel = 0
title.Text = "Orbitaw"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.Highway -- Fuente más chida
title.TextSize = 20
title.TextXAlignment = Enum.TextXAlignment.Center
title.Parent = frame

local titleCorner = Instance.new("UICorner")
titleCorner.CornerRadius = UDim.new(0, 6)
titleCorner.Parent = title

local flyEnabled = false
local flyConnections = {}
local particlesActive = false
local invisibleActive = false
local soundPlaying = false
local teleportActive = true

local flyScript = function()
    for _, connection in pairs(flyConnections) do
        if connection then connection:Disconnect() end
    end
    flyConnections = {}

    if flyEnabled then
        flyEnabled = false
        game.StarterGui:SetCore("SendNotification", {
            Title = "Fly Desactivado",
            Text = "Click Fly para reactivar",
            Duration = 2
        })
        return
    end

    flyEnabled = true

    spawn(function()
        local character = player.Character or player.CharacterAdded:Wait()
        local humanoid = character:WaitForChild("Humanoid")
        local rootPart = character:WaitForChild("HumanoidRootPart")

        local bodyVelocity = Instance.new("BodyVelocity")
        bodyVelocity.MaxForce = Vector3.new(4000, 4000, 4000)
        bodyVelocity.Velocity = Vector3.new(0, 0, 0)
        bodyVelocity.Parent = rootPart

        local bodyAngularVelocity = Instance.new("BodyAngularVelocity")
        bodyAngularVelocity.MaxTorque = Vector3.new(4000, 4000, 4000)
        bodyAngularVelocity.AngularVelocity = Vector3.new(0, 0, 0)
        bodyAngularVelocity.Parent = rootPart

        local camera = workspace.CurrentCamera
        local speed = 50

        local keys = {W = false, A = false, S = false, D = false, Space = false, LeftShift = false}

        local function updateMovement()
            if not flyEnabled then return end

            local moveVector = Vector3.new(0, 0, 0)
            local rotateVector = Vector3.new(0, 0, 0)

            if keys.W then moveVector = moveVector + camera.CFrame.LookVector end
            if keys.S then moveVector = moveVector - camera.CFrame.LookVector end
            if keys.A then moveVector = moveVector - camera.CFrame.RightVector end
            if keys.D then moveVector = moveVector + camera.CFrame.RightVector end
            if keys.Space then moveVector = moveVector + Vector3.new(0, 1, 0) end
            if keys.LeftShift then moveVector = moveVector + Vector3.new(0, -1, 0) end

            bodyVelocity.Velocity = moveVector * speed
            bodyAngularVelocity.AngularVelocity = rotateVector
        end

        local UserInputService = game:GetService("UserInputService")

        flyConnections[#flyConnections + 1] = UserInputService.InputBegan:Connect(function(input, gameProcessed)
            if gameProcessed then return end

            if input.KeyCode == Enum.KeyCode.W then keys.W = true
            elseif input.KeyCode == Enum.KeyCode.A then keys.A = true
            elseif input.KeyCode == Enum.KeyCode.S then keys.S = true
            elseif input.KeyCode == Enum.KeyCode.D then keys.D = true
            elseif input.KeyCode == Enum.KeyCode.Space then keys.Space = true
            elseif input.KeyCode == Enum.KeyCode.LeftShift then keys.LeftShift = true
            elseif input.KeyCode == Enum.KeyCode.E then
                flyEnabled = false
            end
            updateMovement()
        end)

        flyConnections[#flyConnections + 1] = UserInputService.InputEnded:Connect(function(input, gameProcessed)
            if gameProcessed then return end

            if input.KeyCode == Enum.KeyCode.W then keys.W = false
            elseif input.KeyCode == Enum.KeyCode.A then keys.A = false
            elseif input.KeyCode == Enum.KeyCode.S then keys.S = false
            elseif input.KeyCode == Enum.KeyCode.D then keys.D = false
            elseif input.KeyCode == Enum.KeyCode.Space then keys.Space = false
            elseif input.KeyCode == Enum.KeyCode.LeftShift then keys.LeftShift = false
            end
            updateMovement()
        end)

        repeat 
            game:GetService("RunService").Heartbeat:Wait()
            humanoid.PlatformStand = true
        until not flyEnabled

        humanoid.PlatformStand = false
        if bodyVelocity then bodyVelocity:Destroy() end
        if bodyAngularVelocity then bodyAngularVelocity:Destroy() end

        for _, connection in pairs(flyConnections) do
            if connection then connection:Disconnect() end
        end
        flyConnections = {}

        game.StarterGui:SetCore("SendNotification", {
            Title = "Fly Desactivado",
            Text = "Vuelo terminado",
            Duration = 2
        })
    end)

    game.StarterGui:SetCore("SendNotification", {
        Title = "Fly Activado",
        Text = "WASD para moverte, Space/Shift para subir/bajar, E para desactivar",
        Duration = 4
    })
end

local scripts = {
    fly = flyScript,

    caminar = function()
        local Players = game:GetService("Players")
        local player = Players.LocalPlayer
        local function onCharacterAdded(character)
            local humanoid = character:WaitForChild("Humanoid")
            local walkAnimation = Instance.new("Animation")
            walkAnimation.AnimationId = "rbxassetid://126694551967959"

            local animator = humanoid:FindFirstChildOfClass("Animator")
            if not animator then
                animator = Instance.new("Animator")
                animator.Parent = humanoid
            end

            local walkAnimTrack = animator:LoadAnimation(walkAnimation)
            walkAnimTrack.Priority = Enum.AnimationPriority.Movement

            humanoid.Running:Connect(function(speed)
                if speed > 0 then
                    if not walkAnimTrack.IsPlaying then
                        walkAnimTrack:Play()
                    end
                else
                    if walkAnimTrack.IsPlaying then
                        walkAnimTrack:Stop()
                    end
                end
            end)
        end
        player.CharacterAdded:Connect(onCharacterAdded)
        if player.Character then
            onCharacterAdded(player.Character)
        end
        game.StarterGui:SetCore("SendNotification", {
            Title = "Animación Caminar",
            Text = "Animación personalizada aplicada",
            Duration = 3
        })
    end,

    invisible = function()
        if invisibleActive then
            local character = game:GetService("Players").LocalPlayer.Character
            if character then
                for _, part in pairs(character:GetChildren()) do
                    if part:IsA("BasePart") then
                        part.Transparency = 0
                    end
                end
                invisibleActive = false
                game.StarterGui:SetCore("SendNotification", {
                    Title = "Invisible OFF",
                    Text = "Ahora eres visible",
                    Duration = 2
                })
            end
            return
        end

        local character = game:GetService("Players").LocalPlayer.Character
        if character then
            for _, part in pairs(character:GetChildren()) do
                if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then
                    part.Transparency = 1
                end
            end
            invisibleActive = true
            game.StarterGui:SetCore("SendNotification", {
                Title = "Invisible ON",
                Text = "Click de nuevo para revertir",
                Duration = 3
            })
        end
    end,

    particles = function()
        if particlesActive then
            local existingPart = workspace:FindFirstChild("OrbitawParticles")
            if existingPart then
                existingPart:Destroy()
                particlesActive = false
                game.StarterGui:SetCore("SendNotification", {
                    Title = "Partículas OFF",
                    Text = "Efectos removidos",
                    Duration = 2
                })
            end
            return
        end

        local Players = game:GetService("Players")
        local RunService = game:GetService("RunService")
        local player = Players.LocalPlayer
        local character = player.Character or player.CharacterAdded:Wait()
        local humanoidRootPart = character:WaitForChild("HumanoidRootPart")

        local particlePart = Instance.new("Part")
        particlePart.Name = "OrbitawParticles"
        particlePart.Size = Vector3.new(1,1,1)
        particlePart.Anchored = true
        particlePart.CanCollide = false
        particlePart.Transparency = 1
        particlePart.Position = humanoidRootPart.Position + Vector3.new(0,3,0)
        particlePart.Parent = workspace

        local particleEmitter = Instance.new("ParticleEmitter")
        particleEmitter.Texture = "rbxassetid://9423089880"
        particleEmitter.Rate = 20
        particleEmitter.Lifetime = NumberRange.new(1,2)
        particleEmitter.Speed = NumberRange.new(2,4)
        particleEmitter.Size = NumberSequence.new(1)
        particleEmitter.Parent = particlePart

        local connection
        connection = RunService.RenderStepped:Connect(function()
            if player.Character and player.Character:FindFirstChild("HumanoidRootPart") and particlePart.Parent then
                particlePart.Position = player.Character.HumanoidRootPart.Position + Vector3.new(0,3,0)
            else
                connection:Disconnect()
                particlesActive = false
            end
        end)

        particlesActive = true
        game.StarterGui:SetCore("SendNotification", {
            Title = "Partículas ON",
            Text = "Click de nuevo para desactivar",
            Duration = 3
        })
    end,

    skybox = function()
        local Lighting = game:GetService("Lighting")
        for _, child in pairs(Lighting:GetChildren()) do
            if child:IsA("Sky") and child.Name == "OrbitawSky" then
                child:Destroy()
            end
        end

        local sky = Instance.new("Sky")
        sky.Name = "OrbitawSky"
        sky.SkyboxBk = "rbxassetid://87223595873721"
        sky.SkyboxDn = "rbxassetid://87223595873721"
        sky.SkyboxFt = "rbxassetid://87223595873721"
        sky.SkyboxLf = "rbxassetid://87223595873721"
        sky.SkyboxRt = "rbxassetid://87223595873721"
        sky.SkyboxUp = "rbxassetid://87223595873721"
        sky.Parent = Lighting

        spawn(function()
            for _, object in ipairs(workspace:GetDescendants()) do
                if object:IsA("MeshPart") then
                    object.TextureID = "rbxassetid://87223595873721"
                elseif object:IsA("Part") then
                    local decal = Instance.new("Decal")
                    decal.Texture = "rbxassetid://87223595873721"
                    decal.Face = Enum.NormalId.Top
                    decal.Parent = object
                end
            end
        end)

        game.StarterGui:SetCore("SendNotification", {
            Title = "Skybox Cambiado",
            Text = "Mapa y cielo actualizados",
            Duration = 3
        })
    end,

    sound = function()
        if soundPlaying then
            local existingSound = player.PlayerGui:FindFirstChild("OrbitawSound")
            if existingSound then
                existingSound:Destroy()
                soundPlaying = false
                game.StarterGui:SetCore("SendNotification", {
                    Title = "Sonido OFF",
                    Text = "Audio desactivado",
                    Duration = 2
                })
            end
            return
        end

        local sound = Instance.new("Sound")
        sound.Name = "OrbitawSound"
        sound.SoundId = "rbxassetid://78032370350267"
        sound.Looped = true
        sound.Volume = 1
        sound.Parent = player.PlayerGui
        sound:Play()

        soundPlaying = true
        game.StarterGui:SetCore("SendNotification", {
            Title = "HAHAHA ON",
            Text = "Click de nuevo para detener",
            Duration = 3
        })
    end,

    teleport = function()
        local UserInputService = game:GetService("UserInputService")
        local mouse = player:GetMouse()
        local character = player.Character or player.CharacterAdded:Wait()
        local humanoidRootPart = character:WaitForChild("HumanoidRootPart")
        local cooldown = 0.5
        local lastTeleport = 0

        local function createVisualEffect(position)
            local part = Instance.new("Part")
            part.Name = "TeleportEffect"
            part.Anchored = true
            part.CanCollide = false
            part.Size = Vector3.new(2, 0.2, 2)
            part.Position = position
            part.BrickColor = BrickColor.new("Cyan")
            part.Material = Enum.Material.Neon
            part.Transparency = 0.5
            part.Shape = Enum.PartType.Cylinder
            part.Parent = workspace
            game:GetService("Debris"):AddItem(part, 0.5)

            spawn(function()
                for i = 1, 10 do
                    if part.Parent then
                        part.Transparency = part.Transparency + 0.05
                        part.Size = part.Size + Vector3.new(0.3, 0, 0.3)
                        wait(0.05)
                    end
                end
            end)
        end

        local function teleportToPosition(targetPosition)
            if not character or not humanoidRootPart then
                character = player.Character or player.CharacterAdded:Wait()
                humanoidRootPart = character:WaitForChild("HumanoidRootPart")
            end

            local currentTime = tick()
            if currentTime - lastTeleport < cooldown then
                return
            end
            lastTeleport = currentTime

            createVisualEffect(humanoidRootPart.Position)
            humanoidRootPart.CFrame = CFrame.new(targetPosition + Vector3.new(0, 3, 0))
            createVisualEffect(targetPosition)
        end

        local clickConnection
        clickConnection = mouse.Button1Down:Connect(function()
            if teleportActive and mouse.Hit then
                teleportToPosition(mouse.Hit.Position)
            end
        end)

        local keyConnection
        keyConnection = UserInputService.InputBegan:Connect(function(input, gameProcessed)
            if gameProcessed then return end
            if input.KeyCode == Enum.KeyCode.T then
                teleportActive = not teleportActive
                game.StarterGui:SetCore("SendNotification", {
                    Title = "Teleport",
                    Text = teleportActive and "Activado" or "Desactivado",
                    Duration = 2
                })
            end
        end)

        player.CharacterRemoving:Connect(function()
            if clickConnection then clickConnection:Disconnect() end
            if keyConnection then keyConnection:Disconnect() end
        end)

        game.StarterGui:SetCore("SendNotification", {
            Title = "Teleport Activado",
            Text = "Click para teletransportarte | T para toggle",
            Duration = 4
        })
    end
}

local function createButton(text, yPos, scriptName)
    local button = Instance.new("TextButton")
    button.Size = UDim2.new(1, -20, 0, 32)
    button.Position = UDim2.new(0, 10, 0, yPos)
    button.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    button.Text = text
    button.TextColor3 = Color3.fromRGB(255, 255, 255)
    button.Font = Enum.Font.Highway 
    button.TextSize = 14
    button.TextScaled = true 
    button.Parent = frame

    local buttonCorner = Instance.new("UICorner")
    buttonCorner.CornerRadius = UDim.new(0, 4)
    buttonCorner.Parent = button

    button.MouseEnter:Connect(function()
        button.BackgroundColor3 = Color3.fromRGB(70, 70, 70)
    end)

    button.MouseLeave:Connect(function()
        button.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    end)

    button.MouseButton1Click:Connect(function()
        local originalText = button.Text
        button.Text = "Ejecutando..."
        button.BackgroundColor3 = Color3.fromRGB(100, 100, 30)

        spawn(function()
            local success, errorMsg = pcall(scripts[scriptName])

            if success then
                button.Text = "✓ " .. originalText
                button.BackgroundColor3 = Color3.fromRGB(30, 100, 30)
                wait(1)
            else
                button.Text = "Error"
                button.BackgroundColor3 = Color3.fromRGB(100, 30, 30)
                print("Error en " .. scriptName .. ": " .. tostring(errorMsg))
                wait(1.5)
            end

            button.Text = originalText
            button.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
        end)
    end)
end

createButton("Fly", 50, "fly")
createButton("Caminar", 90, "caminar")
createButton("Invisible", 130, "invisible")
createButton("Particles", 170, "particles")
createButton("Skybox", 210, "skybox")
createButton("HAHAHA", 250, "sound")
createButton("Teleport", 290, "teleport")

local closeButton = Instance.new("TextButton")
closeButton.Size = UDim2.new(0, 25, 0, 25)
closeButton.Position = UDim2.new(1, -30, 0, 5)
closeButton.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
closeButton.Text = "X"
closeButton.TextColor3 = Color3.fromRGB(255, 255, 255)
closeButton.Font = Enum.Font.SourceSansBold
closeButton.TextSize = 14
closeButton.Parent = frame

local closeCorner = Instance.new("UICorner")
closeCorner.CornerRadius = UDim.new(0, 4)
closeCorner.Parent = closeButton

closeButton.MouseEnter:Connect(function()
    closeButton.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
end)

closeButton.MouseLeave:Connect(function()
    closeButton.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
end)

closeButton.MouseButton1Click:Connect(function()
    if particlesActive then
        local existingPart = workspace:FindFirstChild("OrbitawParticles")
        if existingPart then existingPart:Destroy() end
    end
    if soundPlaying then
        local existingSound = player.PlayerGui:FindFirstChild("OrbitawSound")
        if existingSound then existingSound:Destroy() end
    end
    if flyEnabled then
        flyEnabled = false
        for _, connection in pairs(flyConnections) do
            if connection then connection:Disconnect() end
        end
    end

    screenGui:Destroy()
end)

spawn(function()
    local UserInputService = game:GetService("UserInputService")
    if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
        frame.Size = UDim2.new(0, 300, 0, 340)
        frame.Position = UDim2.new(0.5, -150, 0.5, -170)
        title.TextSize = 18

        for _, child in pairs(frame:GetChildren()) do
            if child:IsA("TextButton") and child ~= closeButton then
                child.TextSize = 16
            end
        end
    end
end)

game.StarterGui:SetCore("SendNotification", {
    Title = "Orbitaw Cargado",
    Text = "Todos los scripts listos",
    Duration = 3
})
