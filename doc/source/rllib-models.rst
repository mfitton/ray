RLlib Models, Preprocessors, and Action Distributions
=====================================================

The following diagram provides a conceptual overview of data flow between different components in RLlib. We start with an ``Environment``, which given an action produces an observation. The observation is preprocessed by a ``Preprocessor`` and ``Filter`` (e.g. for running mean normalization) before being sent to a neural network ``Model``. The model output is in turn interpreted by an ``ActionDistribution`` to determine the next action.

.. image:: rllib-components.svg

The components highlighted in green can be replaced with custom user-defined implementations, as described in the next sections. The purple components are RLlib internal, which means they can only be modified by changing the algorithm source code.


Default Behaviours
------------------

Built-in Preprocessors
~~~~~~~~~~~~~~~~~~~~~~

RLlib tries to pick one of its built-in preprocessor based on the environment's observation space.
Discrete observations are one-hot encoded, Atari observations downscaled, and Tuple and Dict observations flattened (these are unflattened and accessible via the ``input_dict`` parameter in custom models).
Note that for Atari, RLlib defaults to using the `DeepMind preprocessors <https://github.com/ray-project/ray/blob/master/rllib/env/atari_wrappers.py>`__, which are also used by the OpenAI baselines library.

Built-in Models
~~~~~~~~~~~~~~~

After preprocessing raw environment outputs, these preprocessed observations are then fed through a policy's model.
RLlib picks default models based on a simple heuristic: A vision network (`TF <https://github.com/ray-project/ray/blob/master/rllib/models/tf/visionnet.py>`__ or `Torch <https://github.com/ray-project/ray/blob/master/rllib/models/torch/visionnet.py>`__)
for observations that have a shape of length larger than 2 (for example, (84 x 84 x 3)),
and a fully connected network (`TF <https://github.com/ray-project/ray/blob/master/rllib/models/tf/fcnet.py>`__ or `Torch <https://github.com/ray-project/ray/blob/master/rllib/models/torch/fcnet.py>`__)
for everything else. These models can be configured via the ``model`` config key, documented in the model `catalog <https://github.com/ray-project/ray/blob/master/rllib/models/catalog.py>`__.
Note that for the vision network case, you'll probably have to configure ``conv_filters`` if your environment observations
have custom sizes, e.g., ``"model": {"dim": 42, "conv_filters": [[16, [4, 4], 2], [32, [4, 4], 2], [512, [11, 11], 1]]}`` for 42x42 observations.
Thereby, always make sure that the last Conv2D output has an output shape of `[B, 1, 1, X]` (`[B, X, 1, 1]` for Torch), where B=batch and
X=last Conv2D layer's number of filters, so that RLlib can flatten it. An informative error will be thrown if this is not the case.

In addition, if you set ``"model": {"use_lstm": true}``, the model output will be further processed by an LSTM cell (`TF <https://github.com/ray-project/ray/blob/master/rllib/models/tf/recurrent_net.py>`__ or `Torch <https://github.com/ray-project/ray/blob/master/rllib/models/torch/recurrent_net.py>`__).
More generally, RLlib supports the use of recurrent models for its policy gradient algorithms (A3C, PPO, PG, IMPALA), and RNN support is built into its policy evaluation utilities.
For custom RNN/LSTM setups, see the `Recurrent Models`_. section below.

Built-in Model Parameters
~~~~~~~~~~~~~~~~~~~~~~~~~

The following is a list of the built-in model hyperparameters:

.. literalinclude:: ../../rllib/models/catalog.py
   :language: python
   :start-after: __sphinx_doc_begin__
   :end-before: __sphinx_doc_end__

TensorFlow Models
-----------------

.. note::

    TFModelV2 replaces the previous ``rllib.models.Model`` class, which did not support Keras-style reuse of variables. The ``rllib.models.Model`` class (aka "ModelV1") is deprecated and should no longer be used.

Custom TF models should subclass `TFModelV2 <https://github.com/ray-project/ray/blob/master/rllib/models/tf/tf_modelv2.py>`__ to implement the ``__init__()`` and ``forward()`` methods. Forward takes in a dict of tensor inputs (the observation ``obs``, ``prev_action``, and ``prev_reward``, ``is_training``), optional RNN state,
and returns the model output of size ``num_outputs`` and the new state. You can also override extra methods of the model such as ``value_function`` to implement a custom value branch.
Additional supervised / self-supervised losses can be added via the ``custom_loss`` method:

.. autoclass:: ray.rllib.models.tf.tf_modelv2.TFModelV2

    .. automethod:: __init__
    .. automethod:: forward
    .. automethod:: value_function
    .. automethod:: custom_loss
    .. automethod:: metrics
    .. automethod:: update_ops
    .. automethod:: register_variables
    .. automethod:: variables
    .. automethod:: trainable_variables

Once implemented, the model can then be registered and used in place of a built-in model:

.. code-block:: python

    import ray
    import ray.rllib.agents.ppo as ppo
    from ray.rllib.models import ModelCatalog
    from ray.rllib.models.tf.tf_modelv2 import TFModelV2

    class MyModelClass(TFModelV2):
        def __init__(self, obs_space, action_space, num_outputs, model_config, name): ...
        def forward(self, input_dict, state, seq_lens): ...
        def value_function(self): ...

    ModelCatalog.register_custom_model("my_model", MyModelClass)

    ray.init()
    trainer = ppo.PPOTrainer(env="CartPole-v0", config={
        "model": {
            "custom_model": "my_model",
            # Extra kwargs to be passed to your model's c'tor.
            "custom_model_config": {},
        },
    })

See the `keras model example <https://github.com/ray-project/ray/blob/master/rllib/examples/custom_keras_model.py>`__ for a full example of a TF custom model.
You can also reference the `unit tests <https://github.com/ray-project/ray/blob/master/rllib/tests/test_nested_observation_spaces.py>`__ for Tuple and Dict spaces, which show how to access nested observation fields.

PyTorch Models
--------------

Similarly, you can create and register custom PyTorch models.
See these examples of `fully connected <https://github.com/ray-project/ray/blob/master/rllib/models/torch/fcnet.py>`__, `convolutional <https://github.com/ray-project/ray/blob/master/rllib/models/torch/visionnet.py>`__, and `recurrent <https://github.com/ray-project/ray/blob/master/rllib/models/torch/recurrent_net.py>`__ torch models.

.. autoclass:: ray.rllib.models.torch.torch_modelv2.TorchModelV2

    .. automethod:: __init__
    .. automethod:: forward
    .. automethod:: value_function
    .. automethod:: custom_loss
    .. automethod:: metrics
    .. automethod:: get_initial_state

Once implemented, the model can then be registered and used in place of a built-in model:

.. code-block:: python

    import torch.nn as nn

    import ray
    from ray.rllib.agents import ppo
    from ray.rllib.models import ModelCatalog
    from ray.rllib.models.torch.torch_modelv2 import TorchModelV2

    class CustomTorchModel(TorchModelV2):
        def __init__(self, obs_space, action_space, num_outputs, model_config, name): ...
        def forward(self, input_dict, state, seq_lens): ...
        def value_function(self): ...

    ModelCatalog.register_custom_model("my_model", CustomTorchModel)

    ray.init()
    trainer = ppo.PPOTrainer(env="CartPole-v0", config={
        "framework": "torch",
        "model": {
            "custom_model": "my_model",
            # Extra kwargs to be passed to your model's c'tor.
            "custom_model_config": {},
        },
    })

See the `torch model examples <https://github.com/ray-project/ray/blob/master/rllib/examples/models/>`__ for various examples on how to build a custom Torch model (including recurrent ones).
You can also reference the `unit tests <https://github.com/ray-project/ray/blob/master/rllib/tests/test_nested_observation_spaces.py>`__ for Tuple and Dict spaces, which show how to access nested observation fields.

Recurrent Models
~~~~~~~~~~~~~~~~

Instead of using the ``use_lstm: True`` option, it can be preferable to use a custom recurrent model.
This provides more control over postprocessing of the LSTM output and can also allow the use of multiple LSTM cells to process different portions of the input.
For an RNN model it is preferred to subclass ``RecurrentNetwork`` (either the TF or Torch versions) and to implement ``__init__()``, ``get_initial_state()``, and ``forward_rnn()``.
You can check out the `rnn_model.py <https://github.com/ray-project/ray/blob/master/rllib/examples/models/rnn_model.py>`__ models as examples to implement your own (either TF or Torch):

.. autoclass:: ray.rllib.models.tf.recurrent_net.RecurrentNetwork

    .. automethod:: __init__
    .. automethod:: forward_rnn
    .. automethod:: get_initial_state

Attention Networks/Transformers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

RLlib now also has experimental built-in support for attention/transformer nets (the GTrXL model in particular).
Here is `an example script <https://github.com/ray-project/ray/blob/master/rllib/examples/attention_net.py>`__ on how to use these with some of our algorithms.
`There is also a test case <https://github.com/ray-project/ray/blob/master/rllib/tests/test_attention_net_learning.py>`__, which confirms their learning capabilities in PPO and IMPALA.

Batch Normalization
~~~~~~~~~~~~~~~~~~~

You can use ``tf.layers.batch_normalization(x, training=input_dict["is_training"])`` to add batch norm layers to your custom model: `code example <https://github.com/ray-project/ray/blob/master/rllib/examples/batch_norm_model.py>`__. RLlib will automatically run the update ops for the batch norm layers during optimization (see `tf_policy.py <https://github.com/ray-project/ray/blob/master/rllib/policy/tf_policy.py>`__ and `multi_gpu_impl.py <https://github.com/ray-project/ray/blob/master/rllib/execution/multi_gpu_impl.py>`__ for the exact handling of these updates).

In case RLlib does not properly detect the update ops for your custom model, you can override the ``update_ops()`` method to return the list of ops to run for updates.

Custom Preprocessors
--------------------

.. warning::

    Custom preprocessors are deprecated, since they sometimes conflict with the built-in preprocessors for handling complex observation spaces.
    Please use `wrapper classes <https://github.com/openai/gym/tree/master/gym/wrappers>`__ around your environment instead of preprocessors.

Custom preprocessors should subclass the RLlib `preprocessor class <https://github.com/ray-project/ray/blob/master/rllib/models/preprocessors.py>`__ and be registered in the model catalog:

.. code-block:: python

    import ray
    import ray.rllib.agents.ppo as ppo
    from ray.rllib.models import ModelCatalog
    from ray.rllib.models.preprocessors import Preprocessor

    class MyPreprocessorClass(Preprocessor):
        def _init_shape(self, obs_space, options):
            return new_shape  # can vary depending on inputs

        def transform(self, observation):
            return ...  # return the preprocessed observation

    ModelCatalog.register_custom_preprocessor("my_prep", MyPreprocessorClass)

    ray.init()
    trainer = ppo.PPOTrainer(env="CartPole-v0", config={
        "model": {
            "custom_preprocessor": "my_prep",
            # Extra kwargs to be passed to your model's c'tor.
            "custom_model_config": {},
        },
    })

Custom Models on Top of Built-In Ones
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A common use case is to construct a custom model on top of one of RLlib's built-in ones (e.g. a special output head on top of an fcnet, or an action + observation concat operation at the beginning or
after a conv2d stack).
Here is an example of how to construct a dueling layer head (for DQN) on top of an RLlib default model (either a Conv2D or an FCNet):

.. code-block:: python

    class DuelingQModel(TFModelV2):  # or: TorchModelV2
        """A simple, hard-coded dueling head model."""
        def __init__(obs_space, action_space, num_outputs, model_config, name):
            # Pass num_outputs=None into super constructor (so that no action/
            # logits output layer is built).
            # Alternatively, you can pass in num_outputs=[last layer size of
            # config[model][fcnet_hiddens]] AND set no_last_linear=True, but
            # this seems more tedious as you will have to explain users of this
            # class that num_outputs is NOT the size of your Q-output layer.
            super(DuelingQModel, self).__init__(
                obs_space, action_space, None, model_config, name)
            # Now: self.num_outputs contains the last layer's size, which
            # we can use to construct the dueling head.

            # Construct advantage head ...
            self.A = tf.keras.layers.Dense(num_outputs)
            # torch:
            # self.A = SlimFC(
            #     in_size=self.num_outputs, out_size=num_outputs)

            # ... and value head.
            self.V = tf.keras.layers.Dense(1)
            # torch:
            # self.V = SlimFC(in_size=self.num_outputs, out_size=1)

        def get_q_values(self, inputs):
            # Calculate q-values following dueling logic:
            v = self.V(inputs)  # value
            a = self.A(inputs)  # advantages (per action)
            advantages_mean = tf.reduce_mean(a, 1)
            advantages_centered = a - tf.expand_dims(advantages_mean, 1)
            return v + advantages_centered  # q-values


In order to construct an instance of the above model, you can still use the `catalog <https://github.com/ray-project/ray/blob/master/rllib/models/catalog.py>`__
`get_model_v2` convenience method:

.. code-block:: python

        dueling_model = ModelCatalog.get_model_v2(
            obs_space=[obs_space],
            action_space=[action_space],
            num_outputs=[num q-value (per action) outs],
            model_config=config["model"],
            framework="tf",  # or: "torch"
            model_interface=DuelingQModel,
            name="dueling_q_model"
        )


Now, with the model object, you can get the underlying intermediate output (before the dueling head)
by calling `dueling_model` directly (`out = dueling_model([input_dict])`), and then passing `out` into
your custom `get_q_values` method: `q_values = dueling_model.get_q_values(out)`.


Custom Action Distributions
---------------------------

Similar to custom models and preprocessors, you can also specify a custom action distribution class as follows. The action dist class is passed a reference to the ``model``, which you can use to access ``model.model_config`` or other attributes of the model. This is commonly used to implement `autoregressive action outputs <#autoregressive-action-distributions>`__.

.. code-block:: python

    import ray
    import ray.rllib.agents.ppo as ppo
    from ray.rllib.models import ModelCatalog
    from ray.rllib.models.preprocessors import Preprocessor

    class MyActionDist(ActionDistribution):
        @staticmethod
        def required_model_output_shape(action_space, model_config):
            return 7  # controls model output feature vector size

        def __init__(self, inputs, model):
            super(MyActionDist, self).__init__(inputs, model)
            assert model.num_outputs == 7

        def sample(self): ...
        def logp(self, actions): ...
        def entropy(self): ...

    ModelCatalog.register_custom_action_dist("my_dist", MyActionDist)

    ray.init()
    trainer = ppo.PPOTrainer(env="CartPole-v0", config={
        "model": {
            "custom_action_dist": "my_dist",
        },
    })

Supervised Model Losses
-----------------------

You can mix supervised losses into any RLlib algorithm through custom models. For example, you can add an imitation learning loss on expert experiences, or a self-supervised autoencoder loss within the model. These losses can be defined over either policy evaluation inputs, or data read from `offline storage <rllib-offline.html#input-pipeline-for-supervised-losses>`__.

**TensorFlow**: To add a supervised loss to a custom TF model, you need to override the ``custom_loss()`` method. This method takes in the existing policy loss for the algorithm, which you can add your own supervised loss to before returning. For debugging, you can also return a dictionary of scalar tensors in the ``metrics()`` method. Here is a `runnable example <https://github.com/ray-project/ray/blob/master/rllib/examples/custom_loss.py>`__ of adding an imitation loss to CartPole training that is defined over a `offline dataset <rllib-offline.html#input-pipeline-for-supervised-losses>`__.

**PyTorch**: There is no explicit API for adding losses to custom torch models. However, you can modify the loss in the policy definition directly. Like for TF models, offline datasets can be incorporated by creating an input reader and calling ``reader.next()`` in the loss forward pass.

Self-Supervised Model Losses
----------------------------

You can also use the ``custom_loss()`` API to add in self-supervised losses such as VAE reconstruction loss and L2-regularization.

Variable-length / Complex Observation Spaces
--------------------------------------------

RLlib supports complex and variable-length observation spaces, including ``gym.spaces.Tuple``, ``gym.spaces.Dict``, and ``rllib.utils.spaces.Repeated``. The handling of these spaces is transparent to the user. RLlib internally will insert preprocessors to insert padding for repeated elements, flatten complex observations into a fixed-size vector during transit, and unpack the vector into the structured tensor before sending it to the model. The flattened observation is available to the model as ``input_dict["obs_flat"]``, and the unpacked observation as ``input_dict["obs"]``.

To enable batching of struct observations, RLlib unpacks them in a `StructTensor-like format <https://github.com/tensorflow/community/blob/master/rfcs/20190910-struct-tensor.md>`__. In summary, repeated fields are "pushed down" and become the outer dimensions of tensor batches, as illustrated in this figure from the StructTensor RFC.

.. image:: struct-tensor.png

For further information about complex observation spaces, see:
  * A custom environment and model that uses `repeated struct fields <https://github.com/ray-project/ray/blob/master/rllib/examples/complex_struct_space.py>`__.
  * The pydoc of the `Repeated space <https://github.com/ray-project/ray/blob/master/rllib/utils/spaces/repeated.py>`__.
  * The pydoc of the batched `repeated values tensor <https://github.com/ray-project/ray/blob/master/rllib/models/repeated_values.py>`__.
  * The `unit tests <https://github.com/ray-project/ray/blob/master/rllib/tests/test_nested_observation_spaces.py>`__ for Tuple and Dict spaces.

Variable-length / Parametric Action Spaces
------------------------------------------

Custom models can be used to work with environments where (1) the set of valid actions `varies per step <https://neuro.cs.ut.ee/the-use-of-embeddings-in-openai-five>`__, and/or (2) the number of valid actions is `very large <https://arxiv.org/abs/1811.00260>`__. The general idea is that the meaning of actions can be completely conditioned on the observation, i.e., the ``a`` in ``Q(s, a)`` becomes just a token in ``[0, MAX_AVAIL_ACTIONS)`` that only has meaning in the context of ``s``. This works with algorithms in the `DQN and policy-gradient families <rllib-env.html>`__ and can be implemented as follows:

1. The environment should return a mask and/or list of valid action embeddings as part of the observation for each step. To enable batching, the number of actions can be allowed to vary from 1 to some max number:

.. code-block:: python

   class MyParamActionEnv(gym.Env):
       def __init__(self, max_avail_actions):
           self.action_space = Discrete(max_avail_actions)
           self.observation_space = Dict({
               "action_mask": Box(0, 1, shape=(max_avail_actions, )),
               "avail_actions": Box(-1, 1, shape=(max_avail_actions, action_embedding_sz)),
               "real_obs": ...,
           })

2. A custom model can be defined that can interpret the ``action_mask`` and ``avail_actions`` portions of the observation. Here the model computes the action logits via the dot product of some network output and each action embedding. Invalid actions can be masked out of the softmax by scaling the probability to zero:

.. code-block:: python

    class ParametricActionsModel(TFModelV2):
        def __init__(self,
                     obs_space,
                     action_space,
                     num_outputs,
                     model_config,
                     name,
                     true_obs_shape=(4,),
                     action_embed_size=2):
            super(ParametricActionsModel, self).__init__(
                obs_space, action_space, num_outputs, model_config, name)
            self.action_embed_model = FullyConnectedNetwork(...)

        def forward(self, input_dict, state, seq_lens):
            # Extract the available actions tensor from the observation.
            avail_actions = input_dict["obs"]["avail_actions"]
            action_mask = input_dict["obs"]["action_mask"]

            # Compute the predicted action embedding
            action_embed, _ = self.action_embed_model({
                "obs": input_dict["obs"]["cart"]
            })

            # Expand the model output to [BATCH, 1, EMBED_SIZE]. Note that the
            # avail actions tensor is of shape [BATCH, MAX_ACTIONS, EMBED_SIZE].
            intent_vector = tf.expand_dims(action_embed, 1)

            # Batch dot product => shape of logits is [BATCH, MAX_ACTIONS].
            action_logits = tf.reduce_sum(avail_actions * intent_vector, axis=2)

            # Mask out invalid actions (use tf.float32.min for stability)
            inf_mask = tf.maximum(tf.log(action_mask), tf.float32.min)
            return action_logits + inf_mask, state


Depending on your use case it may make sense to use just the masking, just action embeddings, or both. For a runnable example of this in code, check out `parametric_actions_cartpole.py <https://github.com/ray-project/ray/blob/master/rllib/examples/parametric_actions_cartpole.py>`__. Note that since masking introduces ``tf.float32.min`` values into the model output, this technique might not work with all algorithm options. For example, algorithms might crash if they incorrectly process the ``tf.float32.min`` values. The cartpole example has working configurations for DQN (must set ``hiddens=[]``), PPO (must disable running mean and set ``vf_share_layers=True``), and several other algorithms. Not all algorithms support parametric actions; see the `algorithm overview <rllib-algorithms.html#available-algorithms-overview>`__.


Autoregressive Action Distributions
-----------------------------------

In an action space with multiple components (e.g., ``Tuple(a1, a2)``), you might want ``a2`` to be conditioned on the sampled value of ``a1``, i.e., ``a2_sampled ~ P(a2 | a1_sampled, obs)``. Normally, ``a1`` and ``a2`` would be sampled independently, reducing the expressivity of the policy.

To do this, you need both a custom model that implements the autoregressive pattern, and a custom action distribution class that leverages that model. The `autoregressive_action_dist.py <https://github.com/ray-project/ray/blob/master/rllib/examples/autoregressive_action_dist.py>`__ example shows how this can be implemented for a simple binary action space. For a more complex space, a more efficient architecture such as a `MADE <https://arxiv.org/abs/1502.03509>`__ is recommended. Note that sampling a `N-part` action requires `N` forward passes through the model, however computing the log probability of an action can be done in one pass:

.. code-block:: python

    class BinaryAutoregressiveOutput(ActionDistribution):
        """Action distribution P(a1, a2) = P(a1) * P(a2 | a1)"""

        @staticmethod
        def required_model_output_shape(self, model_config):
            return 16  # controls model output feature vector size

        def sample(self):
            # first, sample a1
            a1_dist = self._a1_distribution()
            a1 = a1_dist.sample()

            # sample a2 conditioned on a1
            a2_dist = self._a2_distribution(a1)
            a2 = a2_dist.sample()

            # return the action tuple
            return TupleActions([a1, a2])

        def logp(self, actions):
            a1, a2 = actions[:, 0], actions[:, 1]
            a1_vec = tf.expand_dims(tf.cast(a1, tf.float32), 1)
            a1_logits, a2_logits = self.model.action_model([self.inputs, a1_vec])
            return (Categorical(a1_logits, None).logp(a1) + Categorical(
                a2_logits, None).logp(a2))

        def _a1_distribution(self):
            BATCH = tf.shape(self.inputs)[0]
            a1_logits, _ = self.model.action_model(
                [self.inputs, tf.zeros((BATCH, 1))])
            a1_dist = Categorical(a1_logits, None)
            return a1_dist

        def _a2_distribution(self, a1):
            a1_vec = tf.expand_dims(tf.cast(a1, tf.float32), 1)
            _, a2_logits = self.model.action_model([self.inputs, a1_vec])
            a2_dist = Categorical(a2_logits, None)
            return a2_dist

    class AutoregressiveActionsModel(TFModelV2):
        """Implements the `.action_model` branch required above."""

        def __init__(self, obs_space, action_space, num_outputs, model_config,
                     name):
            super(AutoregressiveActionsModel, self).__init__(
                obs_space, action_space, num_outputs, model_config, name)
            if action_space != Tuple([Discrete(2), Discrete(2)]):
                raise ValueError(
                    "This model only supports the [2, 2] action space")

            # Inputs
            obs_input = tf.keras.layers.Input(
                shape=obs_space.shape, name="obs_input")
            a1_input = tf.keras.layers.Input(shape=(1, ), name="a1_input")
            ctx_input = tf.keras.layers.Input(
                shape=(num_outputs, ), name="ctx_input")

            # Output of the model (normally 'logits', but for an autoregressive
            # dist this is more like a context/feature layer encoding the obs)
            context = tf.keras.layers.Dense(
                num_outputs,
                name="hidden",
                activation=tf.nn.tanh,
                kernel_initializer=normc_initializer(1.0))(obs_input)

            # P(a1 | obs)
            a1_logits = tf.keras.layers.Dense(
                2,
                name="a1_logits",
                activation=None,
                kernel_initializer=normc_initializer(0.01))(ctx_input)

            # P(a2 | a1)
            # --note: typically you'd want to implement P(a2 | a1, obs) as follows:
            # a2_context = tf.keras.layers.Concatenate(axis=1)(
            #     [ctx_input, a1_input])
            a2_context = a1_input
            a2_hidden = tf.keras.layers.Dense(
                16,
                name="a2_hidden",
                activation=tf.nn.tanh,
                kernel_initializer=normc_initializer(1.0))(a2_context)
            a2_logits = tf.keras.layers.Dense(
                2,
                name="a2_logits",
                activation=None,
                kernel_initializer=normc_initializer(0.01))(a2_hidden)

            # Base layers
            self.base_model = tf.keras.Model(obs_input, context)
            self.register_variables(self.base_model.variables)
            self.base_model.summary()

            # Autoregressive action sampler
            self.action_model = tf.keras.Model([ctx_input, a1_input],
                                               [a1_logits, a2_logits])
            self.action_model.summary()
            self.register_variables(self.action_model.variables)



.. note::

   Not all algorithms support autoregressive action distributions; see the `feature compatibility matrix <rllib-env.html#feature-compatibility-matrix>`__.
