/*
 * Global definitions for the application. These definitions are built-in, though they can be extended if needed.
 *
 * <TODO> Improve documentation. Right now, it's not clear what each property does, and how to use them when creating new definitions.
 * 
 * id:         The unique identifier for this definition. This is used to
 *             reference this definition in packs, and in other definitions.
 *             This should be a singular noun, and should be lowercase. You
 *             can either use underscores or dashes to separate words, but be
 *             consistent with your choice.
 * name:       The display name for this definition. This is used in the UI to
 *             reference this definition. This should be a human-readable name,
 *             and should be title-cased.
 * folder:     The folder where the entities of this definition will be stored
 *             in the pack. This should be a plural noun, and should be lowercase.
 * merge:      The merge strategy for this definition. This determines how
 *             multiple definitions of the same ID will be merged together. The
 *             available strategies are:
 *             - "auto": This is the default strategy. It will automatically merge
 *               definitions based on their properties. If a property is defined in
 *               multiple definitions, it will be merged together. If a property is
 *              defined in one definition, but not in another, it will be added to
 *             the merged definition. If a property is defined in multiple definitions,
 *             but has different values, the value from the first definition will be used.
 *             - "ignore": This strategy will ignore all but the first definition.
 *               This means that if multiple definitions of the same ID are found,
 *               only the first one will be used, and the rest will be ignored.
 * discover:   The discovery key for this definition. This is the property used in
 *             info.json to determine if a pack contains entities of this definition.
 *             If set to true, it will use the ID of the definition as the discovery
 *             key. If set to a string, it will use that string as the discovery key.
 *             If set to false, it will not be discoverable. Note that if a pack has
 *             defined the definition itself, it will be discoverable regardless of
 *             this property. This is only applicable for packs that didn't define it.
 * list:       Whether or not you can define multiple entities of this definition inside
 *             an entity.
 * fields:     Defines the fields that an entity of this type will have. This
 *             determines what properties will be modifyable in the UI, and
 *             how it's modifyable.
 * properties: Defines the properties that an entity of this type will have.
 *             This determines what properties can be set when defining an
 *             entity in a pack, and how it's settable.
 * attributes: Defines the attributes that an entity of this type will have.
 *             This determines what properties are attached to this
 *             definition. These properties are immutable, and are not meant
 *             to be set by the user.
 * 
 * When defining fields, properties and attributes:
 * - The key is the property name that will be used in the entity. This is the name of the property that will be stored in the entity, and should be a valid JavaScript property name.
 * - The value can either be a string, or an object. If it's a string, it will be treated as the type of the field/property/attribute. If it's an object, it can have the following properties:
 *   - name: The display name for this field/property/attribute. This is used in the UI to reference this field/property/attribute. This should be a human-readable name, and should be title-cased.
 *   - type: The type of this field/property/attribute. This determines how the value of this field/property/attribute will be edited in the UI, and how it will be defined in packs. The available types are:
 *     - "string": A simple text input.
 *     - "number": A number input.
 *     - "boolean": A checkbox input.
 *     - "date": A date input.
 *     - "image": An image input.
 *     - "svg": An SVG input.
 *     - "image,svg": An input that accepts both images and SVGs.
 *     - "enum": A dropdown input. The options for this input should be defined in the "options" property of the field/property/attribute definition.
 *     - "definition": A dropdown input that allows you to select an entity of a specific definition. The definition to select from should be defined in the "value" property of the field/property/attribute definition. If the "multi" property is set to true, it will allow you to select multiple entities.
 *   - options: An array of options for enum fields/properties/attributes. This should only be defined if the type is "enum".
 *   - value: The definition to select from for definition fields/properties/attributes. This should only be defined if the type is "definition".
 *   - multi: Whether or not this field/property/attribute allows multiple values. This should only be defined for definition fields/properties/attributes.
 * 
 * When defininng a new definition, it's preferable to only do so on a pack level and not on the global level. This is because global definitions are meant to be built-in. Not everyone will have a need for every definition. The definitions provided here are meant to be general enough to cover a wide range of
 * use cases, but if you have a specific use case that requires a new definition, it's better to define it in a pack. This way, you can keep the global definitions clean and focused on the most common use cases, while still allowing for flexibility and customization through packs.
 */

export const franchises = {
  id: "franchise",
  name: "Franchise",
  folder: "franchises",
  merge: "auto",
  discover: "franchises",
  list: true,
  fields: {
    name: "string",
    symbols: {
      name: "Symbol",
      type: "image,svg",
      entityProp: "symbol"
    }
  }
};

export const works = {
  id: "work",
  name: "Work",
  folder: "works",
  merge: "ignore",
  discover: "works",
  list: true,
  attributes: {
    name: "string",
    description: "string",
    franchise: {
      name: "Franchise",
      type: "definition",
      value: "franchise",
      multi: false,
    },
    type: {
      name: "Type",
      type: "enum",
      options: ["movie", "tv_show", "comic_book", "video_game", "other"],
    },
    startDate: "date",
    endDate: "date"
  }
};

export const appearances = {
  id: "appearance",
  name: "Appearance",
  properties: {
    work: {
      name: "Work",
      type: "definition",
      value: "work",
      multi: false,
    },
    kind: {
      name: "Kind",
      type: "enum",
      multi: true,
      options: ["first", "last", "cameo"]
    }
  },
};
